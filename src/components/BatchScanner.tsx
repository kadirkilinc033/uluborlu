import React, { useState } from 'react';
import { BatchItemResult } from '../types';
import { defangUrl, getThreatLevelConfig } from '../utils/security';
import { Layers, Play, Download, Filter, AlertCircle, CheckCircle2, Search, ArrowRight } from 'lucide-react';

interface BatchScannerProps {
  onInspectSingle: (url: string) => void;
}

export const BatchScanner: React.FC<BatchScannerProps> = ({ onInspectSingle }) => {
  const [inputText, setInputText] = useState<string>(
    `https://www.isbank.com.tr
http://garanti-online-giris-onay.xyz/login.php
https://bit.ly/3sample-link
http://185.193.66.42:8080/auth/edevlet
http://xn--gogle-p7a.com/signin
https://hgs-ceza-sorgulama-odeme.click/fatura
https://google.com`
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'SAFE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleStartBatch = async () => {
    const lines = inputText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      alert('Lütfen en az bir adet URL girin.');
      return;
    }

    setIsRunning(true);
    setResults([]);

    try {
      const res = await fetch('/api/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: lines.slice(0, 20) }),
      });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err: any) {
      alert('Toplu analiz sırasında hata oluştu: ' + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadCsv = () => {
    if (results.length === 0) return;
    const headers = ['URL', 'Varis_Hedefi', 'Hostname', 'Risk_Skoru', 'Tehdit_Seviyesi', 'Hop_Sayisi', 'Marka_Taklidi'];
    const rows = results.map((r) => [
      `"${r.url}"`,
      `"${r.finalUrl}"`,
      `"${r.hostname}"`,
      r.riskScore,
      r.threatLevel,
      r.hopCount,
      `"${r.matchedBrands.join(', ')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `toplu-guvenlik-raporu-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredResults = results.filter((item) => {
    if (filter !== 'ALL' && item.threatLevel !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.url.toLowerCase().includes(q) ||
        item.finalUrl.toLowerCase().includes(q) ||
        item.hostname.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const criticalCount = results.filter((r) => r.threatLevel === 'CRITICAL' || r.threatLevel === 'HIGH').length;
  const mediumCount = results.filter((r) => r.threatLevel === 'MEDIUM').length;
  const safeCount = results.filter((r) => r.threatLevel === 'SAFE').length;

  return (
    <div className="space-y-6">
      {/* Batch Setup Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-white tracking-tight">
              Toplu Bağlantı ve URL Taraması (Batch SOC Engine)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tek seferde 20 adede kadar bağlantıyı paralel olarak tarayın, yönlendirme zincirlerini çözün ve risk dağılımını raporlayın.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Maksimum 20 URL</span>
        </div>

        <div className="space-y-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={5}
            placeholder="Her satıra bir adet URL girin..."
            className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            disabled={isRunning}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              Satır Sayısı:{' '}
              {inputText.split('\n').filter((l) => l.trim().length > 0).length}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInputText('')}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 border border-slate-700 rounded transition-colors cursor-pointer"
                disabled={isRunning}
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={handleStartBatch}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {isRunning ? 'Taranıyor...' : 'Toplu Taramayı Başlat'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results View */}
      {results.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-slate-400">Toplam Taranan</span>
              <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
                {results.length}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-rose-400">Kritik / Yüksek Tehdit</span>
              <div className="text-xl font-bold font-mono tabular-nums text-rose-400 mt-1">
                {criticalCount}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-amber-400">Şüpheli / Riskli</span>
              <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                {mediumCount}
              </div>
            </div>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-emerald-400">Güvenli / Temiz</span>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                {safeCount}
              </div>
            </div>
          </div>

          {/* Table Filters and Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'SAFE'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilter(lvl)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    filter === lvl
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl === 'ALL'
                    ? 'Tümü'
                    : lvl === 'CRITICAL'
                    ? 'Kritik'
                    : lvl === 'HIGH'
                    ? 'Yüksek'
                    : lvl === 'MEDIUM'
                    ? 'Şüpheli'
                    : 'Güvenli'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sonuçlarda ara..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                CSV İndir
              </button>
            </div>
          </div>

          {/* High Density Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3 font-semibold">Giriş URL</th>
                  <th className="py-2.5 px-3 font-semibold">Nihai Varış Hedefi</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Hop</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Risk Skoru</th>
                  <th className="py-2.5 px-3 font-semibold">Durum</th>
                  <th className="py-2.5 px-3 font-semibold">Marka Taklidi</th>
                  <th className="py-2.5 px-3 font-semibold text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 font-mono">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                      Filtreye uygun sonuç bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((item, idx) => {
                    const cfg = getThreatLevelConfig(item.threatLevel);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-300" title={item.url}>
                          {item.url}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-400" title={item.finalUrl}>
                          {item.finalUrl}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-400">
                          {item.hopCount}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                          <span className={cfg.textColor}>{item.riskScore}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${cfg.badgeBg} ${cfg.textColor} ${cfg.borderColor}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans">
                          {item.matchedBrands.length > 0 ? (
                            <span className="text-rose-400 font-medium">
                              {item.matchedBrands.join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            type="button"
                            onClick={() => onInspectSingle(item.url)}
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                          >
                            <span>Detay</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
