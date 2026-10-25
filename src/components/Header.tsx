import React from 'react';

interface HeaderProps {
  activeTab: 'scanner' | 'qr-camera' | 'batch' | 'generator' | 'threat-intel';
  setActiveTab: (tab: 'scanner' | 'qr-camera' | 'batch' | 'generator' | 'threat-intel') => void;
  onQuickScanClick: () => void;
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onQuickScanClick,
  historyCount,
  onOpenHistory,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setActiveTab('qr-camera');
        }}
        className="text-xl font-extrabold tracking-wider text-white whitespace-nowrap shrink-0 transition-opacity hover:opacity-90"
      >
        BAZ
      </a>

      {/* Zone 2: 4–5 concise single-line text navigation links */}
      <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'scanner' ? 'text-white border-b-2 border-emerald-500 pb-0.5 font-semibold' : ''
          }`}
        >
          Bağlantı Analizi
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('qr-camera')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'qr-camera' ? 'text-white border-b-2 border-emerald-500 pb-0.5 font-semibold' : ''
          }`}
        >
          QR Kod Çözücü
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'batch' ? 'text-white border-b-2 border-emerald-500 pb-0.5 font-semibold' : ''
          }`}
        >
          Toplu Tarama
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('generator')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'generator' ? 'text-white border-b-2 border-emerald-500 pb-0.5 font-semibold' : ''
          }`}
        >
          Güvenli QR Üretici
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('threat-intel')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'threat-intel' ? 'text-white border-b-2 border-emerald-500 pb-0.5 font-semibold' : ''
          }`}
        >
          Tehdit Veritabanı
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenHistory}
          className="hidden sm:inline-flex px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-md hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          title="Geçmiş tarama kayıtlarını incele"
        >
          Geçmiş ({historyCount})
        </button>
        <button
          type="button"
          onClick={onQuickScanClick}
          className="px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-950 bg-emerald-400 rounded-md hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          Hızlı Analiz
        </button>
      </div>
    </header>
  );
};
