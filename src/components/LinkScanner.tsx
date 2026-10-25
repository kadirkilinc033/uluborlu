import React, { useState } from 'react';
import { PRESET_SAMPLES, PresetSample } from '../utils/security';
import { Search, ShieldAlert, Sparkles, Clipboard, ArrowRight, CornerDownRight } from 'lucide-react';

interface LinkScannerProps {
  onAnalyze: (url: string, source: 'manual' | 'sample') => void;
  isAnalyzing: boolean;
}

export const LinkScanner: React.FC<LinkScannerProps> = ({ onAnalyze, isAnalyzing }) => {
  const [inputUrl, setInputUrl] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputUrl.trim();
    if (trimmed) {
      onAnalyze(trimmed, 'manual');
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
      }
    } catch {
      // ignore
    }
  };

  const handleSelectPreset = (sample: PresetSample) => {
    setInputUrl(sample.url);
    onAnalyze(sample.url, 'sample');
  };

  return (
    <div className="space-y-6">
      {/* Primary URL Analysis Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white tracking-tight">
            Bağlantı ve QR Güvenlik Denetimi
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Şüpheli bir web adresi, QR kod içeriği veya kısaltılmış linki girerek yönlendirme zinciri, oltalama (phishing) ve homograf saldırılarına karşı derinlemesine analiz edin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Örnek: https://bit.ly/guvenlik-onay veya http://xn--gogle-p7a.com"
              className="w-full pl-10 pr-24 py-3 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              disabled={isAnalyzing}
            />
            <div className="absolute right-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePasteClipboard}
                title="Panodan yapıştır"
                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
              >
                <Clipboard className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                disabled={!inputUrl.trim() || isAnalyzing}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
              >
                {isAnalyzing ? (
                  <span>Analiz...</span>
                ) : (
                  <>
                    <span>Tara</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Real-time Processing Progression State */}
        {isAnalyzing && (
          <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-emerald-400">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Güvenlik Sandbox ve Tehdit İstihbaratı Çalışıyor</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-400">
              <div className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1. Ağ & Yönlendirme</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>2. Punycode & Typosquat</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>3. Sezgisel Kural Motoru</span>
              </div>
              <div className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>4. Gemini AI İstihbaratı</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Test Case Scenarios */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">
              Hızlı Güvenlik Test Örnekleri (Simülasyon Senaryoları)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Tek tıkla analiz başlatın</span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Farklı siber saldırı tekniklerini (Quishing, homograf sahteciliği, yönlendirme maskeleme, doğrudan IP girişleri) test etmek için aşağıdaki örnekleri deneyebilirsiniz:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRESET_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectPreset(sample)}
              disabled={isAnalyzing}
              className="text-left p-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 rounded-lg transition-all group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                  {sample.title}
                </span>
                <span className="text-slate-500 text-[11px]">{sample.tag}</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                {sample.description}
              </p>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 group-hover:text-slate-300 truncate">
                <CornerDownRight className="w-3 h-3 shrink-0 text-emerald-500" />
                <span className="truncate">{sample.url}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
