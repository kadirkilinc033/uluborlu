import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, AlertTriangle, Download, QrCode as QrIcon, Wifi, User, Globe, FileText, Check } from 'lucide-react';

export const QrGenerator: React.FC = () => {
  const [qrType, setQrType] = useState<'url' | 'wifi' | 'text' | 'vcard'>('url');
  const [urlInput, setUrlInput] = useState<string>('https://example.com');
  const [wifiSsid, setWifiSsid] = useState<string>('Sirket_Guest_WiFi');
  const [wifiPassword, setWifiPassword] = useState<string>('GuvenliSifre2026!');
  const [wifiEncryption, setWifiEncryption] = useState<string>('WPA');
  const [textInput, setTextInput] = useState<string>('Güvenli veri aktarımı');
  const [vcardName, setVcardName] = useState<string>('Ahmet Yılmaz');
  const [vcardPhone, setVcardPhone] = useState<string>('+90 555 123 4567');
  const [vcardEmail, setVcardEmail] = useState<string>('ahmet@example.com');

  const [eccLevel, setEccLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [fgColor, setFgColor] = useState<string>('#0f172a');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [auditWarnings, setAuditWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute final payload string
  let finalPayload = '';
  if (qrType === 'url') {
    finalPayload = urlInput.trim();
  } else if (qrType === 'wifi') {
    finalPayload = `WIFI:S:${wifiSsid};T:${wifiEncryption};P:${wifiPassword};;`;
  } else if (qrType === 'vcard') {
    finalPayload = `BEGIN:VCARD\nVERSION:3.0\nN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
  } else {
    finalPayload = textInput.trim();
  }

  // Pre-generation security audit
  useEffect(() => {
    const warnings: string[] = [];
    if (qrType === 'url' && urlInput.trim()) {
      const trimmed = urlInput.trim().toLowerCase();
      if (trimmed.startsWith('http://')) {
        warnings.push('Şifresiz HTTP protokolü: QR kod kullanıcıları aradaki saldırganlar (MitM) tarafından yönlendirilebilir. Mümkünse HTTPS kullanın.');
      }
      if (trimmed.includes('@') && trimmed.indexOf('@') < trimmed.indexOf('/', 8)) {
        warnings.push('URL içinde @ sembolü tespit edildi: Bu teknik kullanıcıları sahte hedefe yönlendirmek için kullanılabilir.');
      }
      if (/\b(login|giris|hesap|fatura|odeme)\b/i.test(trimmed) && !trimmed.startsWith('https://')) {
        warnings.push('Giriş veya ödeme ifadesi barındıran bağlantılarda mutlaka geçerli bir SSL/TLS sertifikası (HTTPS) gereklidir.');
      }
      if (/\.(xyz|click|top|buzz|work|rest)\b/i.test(trimmed)) {
        warnings.push('Yüksek riskli TLD uzantısı (.xyz, .click vb.): Bu uzantılar kurumsal ve halka açık QR kodlarında güvenlik tarayıcıları tarafından şüpheli işaretlenebilir.');
      }
    }
    setAuditWarnings(warnings);
  }, [qrType, urlInput]);

  // Render QR Canvas
  useEffect(() => {
    if (!canvasRef.current || !finalPayload) return;
    QRCode.toCanvas(
      canvasRef.current,
      finalPayload,
      {
        errorCorrectionLevel: eccLevel,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        width: 280,
        margin: 2,
      },
      (err) => {
        if (err) console.error('QR rendering error:', err);
      }
    );
  }, [finalPayload, eccLevel, fgColor, bgColor]);

  const handleDownloadPng = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `guvenli-qr-${Date.now()}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight">
            Güvenli QR Kod Üretici & Ön Güvenlik Denetimi
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ürettiğiniz QR kodlarının hedef bağlantısını yayına almadan önce güvenlik standartlarına göre test edin ve hataya dayanıklı QR matrisleri oluşturun.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: Data and Security Settings */}
        <div className="lg:col-span-7 space-y-5">
          {/* Payload Type Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">QR İçerik Tipi</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setQrType('url')}
                className={`flex items-center justify-center gap-1.5 p-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  qrType === 'url'
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Web URL
              </button>
              <button
                type="button"
                onClick={() => setQrType('wifi')}
                className={`flex items-center justify-center gap-1.5 p-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  qrType === 'wifi'
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                Wi-Fi Ağı
              </button>
              <button
                type="button"
                onClick={() => setQrType('vcard')}
                className={`flex items-center justify-center gap-1.5 p-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  qrType === 'vcard'
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                vCard Kişi
              </button>
              <button
                type="button"
                onClick={() => setQrType('text')}
                className={`flex items-center justify-center gap-1.5 p-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                  qrType === 'text'
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Düz Metin
              </button>
            </div>
          </div>

          {/* Type Specific Fields */}
          {qrType === 'url' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Hedef Web Bağlantısı (URL)</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://kurumunuz.com/odeme"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {qrType === 'wifi' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Ağ Adı (SSID)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Ağ Şifresi</label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {qrType === 'vcard' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-300">Tam İsim</label>
                <input
                  type="text"
                  value={vcardName}
                  onChange={(e) => setVcardName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300">Telefon</label>
                  <input
                    type="text"
                    value={vcardPhone}
                    onChange={(e) => setVcardPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300">E-Posta</label>
                  <input
                    type="email"
                    value={vcardEmail}
                    onChange={(e) => setVcardEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {qrType === 'text' && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300">Metin İçeriği</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* ECC and Appearance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Hata Düzeltme Seviyesi (ECC)
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                {(['L', 'M', 'Q', 'H'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEccLevel(lvl)}
                    className={`py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                      eccLevel === lvl
                        ? 'bg-slate-800 text-white shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title={
                      lvl === 'L'
                        ? '%7 hasar toleransı'
                        : lvl === 'M'
                        ? '%15 hasar toleransı'
                        : lvl === 'Q'
                        ? '%25 hasar toleransı'
                        : '%30 yüksek hasar toleransı (Önerilen)'
                    }
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {eccLevel === 'H'
                  ? 'Yüksek dayanıklılık: QR kodunun %30\'u yıpransa dahi okunabilir.'
                  : eccLevel === 'Q'
                  ? 'Orta-Yüksek dayanıklılık: %25 hasar telafisi.'
                  : eccLevel === 'M'
                  ? 'Standart dayanıklılık: %15 hasar telafisi.'
                  : 'Düşük dayanıklılık: %7 hasar telafisi.'}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Renk Tercihleri
              </label>
              <div className="flex items-center gap-4 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ön Plan:</span>
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Arka Plan:</span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pre-Scan Security Audit Warnings */}
          <div className="pt-2">
            {auditWarnings.length > 0 ? (
              <div className="p-3.5 bg-amber-950/40 border border-amber-800 rounded-lg space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Ön Güvenlik Denetimi Uyarıları</span>
                </div>
                <ul className="text-xs text-amber-200/90 space-y-1 pl-4 list-disc">
                  {auditWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-2 text-xs text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Ön güvenlik denetimi başarılı: Bariz oltalama veya şifresiz protokol riski saptanmadı.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Preview Card */}
        <div className="lg:col-span-5 p-6 bg-slate-950 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <canvas ref={canvasRef} className="rounded" />
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-semibold text-white">Canlı QR Kod Matrisi</div>
            <div className="text-slate-400 font-mono text-[11px] max-w-xs truncate">
              {finalPayload}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              PNG Olarak İndir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
