import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LinkScanner } from './components/LinkScanner';
import { QrScanner } from './components/QrScanner';
import { AnalysisReportView } from './components/AnalysisReportView';
import { BatchScanner } from './components/BatchScanner';
import { QrGenerator } from './components/QrGenerator';
import { ThreatEncyclopedia } from './components/ThreatEncyclopedia';
import { ScanHistoryModal } from './components/ScanHistoryModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ScanReport } from './types';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function App() {
  // Default to 'qr-camera' as requested by the user for immediate camera scanning
  const [activeTab, setActiveTab] = useState<'qr-camera' | 'scanner' | 'batch' | 'generator' | 'threat-intel'>('qr-camera');
  const [currentReport, setCurrentReport] = useState<ScanReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<ScanReport[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      const saved = localStorage.getItem('baz_scan_history') || localStorage.getItem('aegis_scan_history');
      if (saved) {
        setScanHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newReport: ScanReport) => {
    setScanHistory((prev) => {
      const filtered = prev.filter((item) => item.input !== newReport.input);
      const updated = [newReport, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('baz_scan_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem('baz_scan_history');
      localStorage.removeItem('aegis_scan_history');
    } catch {
      // ignore
    }
  };

  // Main Link / QR Payload Analysis Handler returning the ScanReport
  const handleAnalyze = async (
    payload: string,
    source: 'manual' | 'camera' | 'upload' | 'batch' | 'sample'
  ): Promise<ScanReport | null> => {
    if (!payload.trim()) return null;
    setIsAnalyzing(true);
    setErrorNotice(null);

    try {
      const res = await fetch('/api/analyze-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: payload.trim(), source }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Sunucu hatası: ${res.status}`);
      }

      const report: ScanReport = await res.json();
      saveToHistory(report);

      // If manual from LinkScanner or batch, go straight to report view
      if (source === 'manual' || source === 'sample' || source === 'batch') {
        setCurrentReport(report);
      }
      return report;
    } catch (err: any) {
      console.error('Analysis request error:', err);
      setErrorNotice(err.message || 'Analiz işlemi gerçekleştirilemedi.');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* 3-Zone Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setErrorNotice(null);
        }}
        onQuickScanClick={() => {
          setActiveTab('qr-camera');
          setCurrentReport(null);
          setErrorNotice(null);
        }}
        historyCount={scanHistory.length}
        onOpenHistory={() => setHistoryModalOpen(true)}
      />

      {/* Main Content Area with Safe Bottom Padding for Mobile */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-28 lg:pb-8 space-y-6">
        {/* Error Notification Banner */}
        {errorNotice && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorNotice(null)}
              className="text-xs text-rose-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              Kapat
            </button>
          </div>
        )}

        {/* View Switcher */}
        {currentReport ? (
          <AnalysisReportView
            report={currentReport}
            onReset={() => setCurrentReport(null)}
          />
        ) : (
          <div>
            {activeTab === 'qr-camera' && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-base font-semibold text-white tracking-tight">
                    Canlı Kamera ile QR Kod Güvenlik Tarayıcısı
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Kameranızı açın, incelemek istediğiniz QR kodunu gösterin. Sistem kodu anında çözecek, yönlendirmeleri izleyecek ve bağlantının güvenli olup olmadığını sesli ve görsel bildirimle iletecektir.
                  </p>
                </div>

                <QrScanner
                  onScanPayload={(payload, source) => handleAnalyze(payload, source)}
                  onViewFullReport={(report) => setCurrentReport(report)}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            )}

            {activeTab === 'scanner' && (
              <div className="space-y-6">
                <LinkScanner
                  onAnalyze={async (url, source) => {
                    const r = await handleAnalyze(url, source);
                    if (r) setCurrentReport(r);
                  }}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            )}

            {activeTab === 'batch' && (
              <BatchScanner
                onInspectSingle={async (url) => {
                  const r = await handleAnalyze(url, 'batch');
                  if (r) setCurrentReport(r);
                }}
              />
            )}

            {activeTab === 'generator' && <QrGenerator />}

            {activeTab === 'threat-intel' && <ThreatEncyclopedia />}
          </div>
        )}
      </main>

      {/* Clean Operations Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-slate-400">BAZ Güvenlik Analiz Sistemi</span>
            <span className="text-slate-600">·</span>
            <span>Canlı Kamera Quishing & Oltalama Denetimi</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Yönlendirme İzleyici (Unshortener)</span>
            <span className="text-slate-700">/</span>
            <span>Punycode Homograf Koruması</span>
            <span className="text-slate-700">/</span>
            <span>Gemini Siber İstihbaratı</span>
          </div>
        </div>
      </footer>

      {/* History Modal */}
      <ScanHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        history={scanHistory}
        onSelectReport={(report) => {
          setCurrentReport(report);
          setActiveTab('qr-camera');
        }}
        onClearHistory={handleClearHistory}
      />

      {/* Mobile Fixed Bottom Tab Bar for One-Handed Thumb Ergonomics */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setErrorNotice(null);
        }}
        onResetReport={() => setCurrentReport(null)}
      />
    </div>
  );
}
