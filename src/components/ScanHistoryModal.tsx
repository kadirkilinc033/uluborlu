import React, { useState } from 'react';
import { ScanReport } from '../types';
import { getThreatLevelConfig, defangUrl } from '../utils/security';
import { X, Trash2, ArrowRight, Search, ShieldAlert, History } from 'lucide-react';

interface ScanHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ScanReport[];
  onSelectReport: (report: ScanReport) => void;
  onClearHistory: () => void;
}

export const ScanHistoryModal: React.FC<ScanHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onSelectReport,
  onClearHistory,
}) => {
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const filtered = history.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.input.toLowerCase().includes(q) ||
      item.finalUrl.toLowerCase().includes(q) ||
      item.aiIntel.threatType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Tarama Geçmişi Kayıtları</h3>
            <span className="text-xs text-slate-500 font-mono">({history.length})</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Geçmiş taramalarda ara..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Tüm tarama geçmişi silinsin mi?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-900/60 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Geçmişi Temizle</span>
            </button>
          )}
        </div>

        {/* List of Scans */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Henüz kaydedilmiş bir tarama geçmişi bulunmuyor.
            </div>
          ) : (
            filtered.map((item) => {
              const cfg = getThreatLevelConfig(item.finalThreatLevel);
              return (
                <div
                  key={item.id}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-between gap-4 transition-colors group cursor-pointer"
                  onClick={() => {
                    onSelectReport(item);
                    onClose();
                  }}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.badgeBg} ${cfg.textColor} ${cfg.borderColor}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                        {cfg.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Skor: <span className="font-bold">{item.finalRiskScore}/100</span>
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {new Date(item.timestamp).toLocaleTimeString('tr-TR')}
                      </span>
                    </div>

                    <div className="text-xs font-mono text-slate-300 truncate" title={item.input}>
                      {defangUrl(item.input)}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center text-slate-500 group-hover:text-emerald-400 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
