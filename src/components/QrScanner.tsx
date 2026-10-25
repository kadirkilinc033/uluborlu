import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { decodeQrFromImageFile, getThreatLevelConfig, defangUrl } from '../utils/security';
import { playScanDetectedSound, playSafeVerdictSound, playDangerVerdictSound } from '../utils/audioAlerts';
import { ScanReport } from '../types';
import {
  Camera,
  CameraOff,
  Upload,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Volume2,
  VolumeX,
  Flashlight,
  Sparkles,
  Smartphone,
  Image as ImageIcon,
} from 'lucide-react';

interface QrScannerProps {
  onScanPayload: (payload: string, source: 'camera' | 'upload' | 'manual') => Promise<ScanReport | null>;
  onViewFullReport: (report: ScanReport) => void;
  isAnalyzing: boolean;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  onScanPayload,
  onViewFullReport,
  isAnalyzing,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'upload'>('camera');
  // CAMERA STARTS OFF BY DEFAULT FOR PRIVACY & BATTERY SAVINGS
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Live Verdict & State
  const [scannedPayload, setScannedPayload] = useState<string | null>(null);
  const [currentScanReport, setCurrentScanReport] = useState<ScanReport | null>(null);
  const [scanningInProgress, setScanningInProgress] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Multi-tier progressive constraints for maximum mobile compatibility (iOS Safari, Android Chrome, WebView)
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    const attempts: MediaStreamConstraints[] = [
      // Tier 1: High definition rear camera with ideal resolution
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      // Tier 2: Basic facing mode without strict resolution
      {
        video: {
          facingMode: facingMode,
        },
        audio: false,
      },
      // Tier 3: Universal fallback (any available camera sensor)
      {
        video: true,
        audio: false,
      },
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraint of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraint);
        if (stream) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!stream) {
      console.error('All camera attempts failed:', lastError);
      let errorMsg = 'Kamera cihazı başlatılamadı.';
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        errorMsg = 'Kamera erişim izni verilmedi. Telefonunuzun tarayıcı izinlerinden kameraya onay verin veya alternatif olarak fotoğraf çekerek taramayı kullanın.';
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        errorMsg = 'Cihazınızda kullanılabilir kamera donanımı tespit edilemedi.';
      }
      setCameraError(errorMsg);
      setCameraActive(false);
      return;
    }

    streamRef.current = stream;

    // Check if torch/flashlight is supported on the phone
    try {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && 'torch' in capabilities) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch {
      setHasTorch(false);
    }

    if (videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      // Critical iOS Safari attributes for inline video playback without fullscreen interruption
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.playsInline = true;
      video.muted = true;

      try {
        await video.play();
        setCameraActive(true);
      } catch (playErr) {
        console.debug('Autoplay video interrupted or pending user tap:', playErr);
        setCameraActive(true);
      }
    }
  }, [facingMode, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.error('Torch toggle error:', err);
      }
    }
  };

  // Process and analyze QR code
  const handleDetectedCode = useCallback(
    async (codeText: string, source: 'camera' | 'upload') => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      // STOP CAMERA IMMEDIATELY upon detection to preserve battery & privacy
      stopCamera();

      setScanningInProgress(true);
      setScannedPayload(codeText);

      // Play capture audio
      if (soundEnabled) {
        playScanDetectedSound();
      }

      // Haptic feedback for touch devices (smartphones)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([70, 40, 70]);
        } catch {
          // ignore
        }
      }

      try {
        const report = await onScanPayload(codeText, source);
        if (report) {
          setCurrentScanReport(report);
          // Play verdict chime
          if (soundEnabled) {
            if (report.finalThreatLevel === 'SAFE' || report.finalThreatLevel === 'LOW') {
              playSafeVerdictSound();
            } else {
              playDangerVerdictSound();
            }
          }
        }
      } catch (err) {
        console.error('Analysis error:', err);
      } finally {
        setScanningInProgress(false);
        isProcessingRef.current = false;
      }
    },
    [onScanPayload, soundEnabled, stopCamera]
  );

  // Continuous QR Scanning loop via requestAnimationFrame
  useEffect(() => {
    if (!cameraActive || currentScanReport || scanningInProgress) return;

    const scan = () => {
      if (
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
        !isProcessingRef.current
      ) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });

            if (code && code.data && code.data.trim()) {
              handleDetectedCode(code.data.trim(), 'camera');
              return;
            }
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(scan);
    };

    animationFrameRef.current = requestAnimationFrame(scan);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, currentScanReport, scanningInProgress, handleDetectedCode]);

  // Clean cleanup on unmount or mode switch (NEVER auto-starts camera on mount)
  useEffect(() => {
    if (activeMode !== 'camera') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeMode, stopCamera]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Lütfen geçerli bir resim dosyası seçin.');
      return;
    }
    try {
      const result = await decodeQrFromImageFile(file);
      if (result) {
        setUploadedImageUrl(result.dataUrl);
        handleDetectedCode(result.text, 'upload');
      } else {
        alert('Fotoğrafta okunabilir bir QR kodu bulunamadı. Lütfen QR kodunu daha yakından ve net çekmeyi deneyin.');
      }
    } catch (err: any) {
      alert('Fotoğraf işlenirken hata oluştu: ' + err.message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleResetForNextScan = () => {
    setCurrentScanReport(null);
    setScannedPayload(null);
    setUploadedImageUrl(null);
    isProcessingRef.current = false;
    // Start camera for the next scan when clicking "Yeni QR Tara"
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  const threatConfig = currentScanReport
    ? getThreatLevelConfig(currentScanReport.finalThreatLevel)
    : null;

  const isSafe =
    currentScanReport &&
    (currentScanReport.finalThreatLevel === 'SAFE' || currentScanReport.finalThreatLevel === 'LOW');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Hidden file input for native phone camera photo capture */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* Top Controls Bar with Thumb Hitboxes */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 bg-slate-950/80 gap-2">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => {
              handleResetForNextScan();
              setActiveMode('camera');
            }}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeMode === 'camera' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            Canlı Kamera
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setCurrentScanReport(null);
              setActiveMode('upload');
            }}
            className={`flex items-center gap-2 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeMode === 'upload' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Galeri / Dosya
          </button>
        </div>

        {/* Camera action buttons with >= 44px touch hitbox */}
        <div className="flex items-center gap-2">
          {activeMode === 'camera' && cameraActive && !currentScanReport && (
            <>
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs rounded-xl border transition-colors cursor-pointer ${
                    torchOn
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : 'text-slate-300 hover:text-white bg-slate-800 border-slate-700'
                  }`}
                  title="Feneri Aç / Kapat"
                >
                  <Flashlight className="w-4 h-4" />
                  <span className="hidden sm:inline">{torchOn ? 'Fener Açık' : 'Fener'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                }}
                className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                title="Ön/Arka Kamerayı Değiştir"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Kamerayı Çevir</span>
              </button>
            </>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border text-xs transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Sesli bildirimler açık' : 'Ses kapalı'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="p-4 sm:p-6 space-y-4">
        {activeMode === 'camera' ? (
          <div className="space-y-4">
            {/* PROMINENT TOP CAMERA CONTROL STRIP (OPEN / CLOSE ON DEMAND) */}
            <div className="max-w-sm sm:max-w-md mx-auto flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-300">
                  {cameraActive ? 'Kamera Açık · Taranıyor...' : 'Kamera Kapalı (Gizlilik & Tasarruf)'}
                </span>
              </div>

              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] text-xs font-bold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Kamerayı Kapat</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamerayı Aç</span>
                </button>
              )}
            </div>

            {/* Video Viewport / Standby Box */}
            <div className="relative w-full max-w-sm sm:max-w-md mx-auto aspect-[3/4] sm:aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
              {/* Hidden Canvas for Frame Processing */}
              <canvas ref={canvasRef} className="hidden" />

              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                playsInline
                muted
                autoPlay
              />

              {/* Viewfinder Target Overlays when scanning */}
              {cameraActive && !scanningInProgress && !currentScanReport && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-300 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-300 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-300 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-300 rounded-br-xl" />

                    {/* Scanning radar sweep bar */}
                    <div className="w-full h-0.5 bg-emerald-400/90 shadow-[0_0_12px_#34d399] animate-[bounce_2s_infinite]" />
                  </div>
                  <div className="mt-4 px-3 py-1 bg-black/75 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-300 border border-emerald-500/40">
                    Kare Kodu Çerçeveye Hizalayın
                  </div>
                </div>
              )}

              {/* Live Security Analysis Progress State */}
              {scanningInProgress && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center mb-3">
                    <Sparkles className="w-8 h-8 text-emerald-400 animate-spin" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    QR Kod Algılandı
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs font-mono truncate mb-2">
                    {scannedPayload}
                  </p>
                  <div className="text-xs text-emerald-400 font-semibold animate-pulse">
                    Bağlantı Güvenliği & Oltalama Analizi Yapılıyor...
                  </div>
                </div>
              )}

              {/* Standby State (When camera is closed) */}
              {!cameraActive && !scanningInProgress && !currentScanReport && (
                <div className="p-6 text-center max-w-sm space-y-4">
                  {cameraError ? (
                    <div className="space-y-3">
                      <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
                      <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          onClick={startCamera}
                          className="w-full min-h-[48px] flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors cursor-pointer"
                        >
                          Kamerayı Yeniden Dene
                        </button>
                        <button
                          type="button"
                          onClick={() => nativeCameraInputRef.current?.click()}
                          className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                        >
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                          Telefon Kamerasından Fotoğraf Çek
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mx-auto shadow-md">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-white">QR Tarayıcı Hazır</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Kamera pil ve gizliliğinizi korumak için kapalıdır. Taramaya başlamak için butona dokunun.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full min-h-[48px] flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/40 active:scale-95"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Kamerayı Aç ve Tara</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Alternative Mobile Snapshot Trigger */}
            <div className="max-w-sm sm:max-w-md mx-auto flex items-center justify-center">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Fotoğraf Çekerek QR Tara (Alternatif)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-sm sm:max-w-md mx-auto">
            {/* File Upload Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'
              }`}
              onClick={() => {
                const input = document.getElementById('qr-file-input');
                if (input) input.click();
              }}
            >
              <input
                id="qr-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              {uploadedImageUrl ? (
                <div className="space-y-3">
                  <img
                    src={uploadedImageUrl}
                    alt="Yüklenen QR Kodu"
                    className="max-h-48 max-w-xs mx-auto rounded-lg border border-slate-700 shadow-sm"
                  />
                  <div className="text-xs text-slate-400">
                    Görsel işlendi. Değiştirmek için dokunun.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto" />
                  <div>
                    <span className="text-sm font-semibold text-slate-200">
                      Galeriden QR Görseli Seçin
                    </span>
                    <p className="text-xs text-slate-500 mt-1">Ekran görüntüsü veya fotoğraf</p>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Doğrudan Fotoğraf Çek</span>
            </button>
          </div>
        )}

        {/* IMMEDIATE SAFETY NOTIFICATION VERDICT BANNER (OPTIMIZED FOR PHONE THUMB ZONE) */}
        {currentScanReport && threatConfig && (
          <div
            className={`mt-4 p-5 sm:p-6 rounded-2xl border transition-all ${
              isSafe
                ? 'bg-emerald-950/50 border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                : 'bg-rose-950/60 border-rose-500/80 shadow-[0_0_30px_rgba(225,29,72,0.25)]'
            }`}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    isSafe
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                      : 'bg-rose-950 border-rose-500 text-rose-400'
                  }`}
                >
                  {isSafe ? (
                    <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
                  ) : (
                    <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 animate-pulse" />
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold tracking-wide border ${threatConfig.badgeBg} ${threatConfig.textColor} ${threatConfig.borderColor}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${threatConfig.dotColor}`} />
                      {isSafe ? 'BU BAĞLANTI GÜVENLİ' : 'DİKKAT! TEHLİKELİ BAĞLANTI'}
                    </span>
                    <span className="text-xs text-slate-300 font-mono tabular-nums">
                      Risk Skoru: <span className="font-bold text-white">{currentScanReport.finalRiskScore}</span>/100
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {currentScanReport.aiIntel.threatType}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentScanReport.aiIntel.executiveSummary}
                  </p>

                  {/* Scanned URL Defanged display */}
                  <div className="pt-1 text-xs font-mono text-slate-300 break-all">
                    <span className="text-slate-500 mr-1.5">Hedef:</span>
                    <span className={isSafe ? 'text-emerald-300' : 'text-rose-300 font-bold'}>
                      {defangUrl(currentScanReport.finalUrl)}
                    </span>
                  </div>
                </div>
              </div>

              {/* If dangerous, show immediate warning bullets */}
              {!isSafe && currentScanReport.heuristics.findings.length > 0 && (
                <div className="p-3 bg-black/40 rounded-xl border border-rose-900/50 space-y-1.5 text-xs">
                  <div className="font-bold text-rose-300">Tespit Edilen Tehdit Göstergeleri:</div>
                  {currentScanReport.heuristics.findings.slice(0, 3).map((f, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-rose-200">
                      <span className="text-rose-400 font-bold">✕</span>
                      <span>{f.title}: {f.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Touch Ergonomic Action Buttons (Thumb Zone) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleResetForNextScan}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Yeni QR Tara (Kamerayı Aç)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewFullReport(currentScanReport)}
                  className={`w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md ${
                    isSafe
                      ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                      : 'bg-rose-500 hover:bg-rose-400 text-white'
                  }`}
                >
                  <span>Detaylı Raporu İncele</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
