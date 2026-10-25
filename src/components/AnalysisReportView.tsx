import React, { useState } from 'react';
import { ScanReport } from '../types';
import { defangUrl, getThreatLevelConfig } from '../utils/security';
import {
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  FileCode,
  Lock,
  Unlock,
  AlertTriangle,
  Globe,
  Radio,
  Server,
  Layers,
  Sparkles,
  Printer,
} from 'lucide-react';

interface AnalysisReportViewProps {
  report: ScanReport;
  onReset: () => void;
}

export const AnalysisReportView: React.FC<AnalysisReportViewProps> = ({ report, onReset }) => {
  const [isDefanged, setIsDefanged] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'redirects' | 'heuristics' | 'intel' | 'headers'>('overview');

  const config = getThreatLevelConfig(report.finalThreatLevel);
  const displayUrl = isDefanged ? defangUrl(report.finalUrl) : report.finalUrl;
  const initialDisplayUrl = isDefanged ? defangUrl(report.input) : report.input;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `baz-tehdit-raporu-${report.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Yeni Analiz
          </button>
          <span className="text-slate-600">·</span>
          <div className="text-xs text-slate-400 font-mono">
            Rapor ID: <span className="text-slate-300">{report.id}</span>
          </div>
          <span className="text-slate-600">·</span>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            {new Date(report.timestamp).toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDefanged(!isDefanged)}
            className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
              isDefanged
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
            title="Zararlı linkin tıklanmasını engellemek için URL'yi defang eder (hxxps[://])"
          >
            {isDefanged ? 'Defanged URL (Güvenli)' : 'Normal URL'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer"
            title="Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Kopyala</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadJson}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer"
            title="JSON Tehdit Raporunu İndir"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>JSON İndir</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors cursor-pointer"
            title="Yazdır / PDF Olarak Kaydet"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Yazdır</span>
          </button>
        </div>
      </div>

      {/* Primary Threat Verdict Hero Banner */}
      <div className={`p-6 rounded-xl border bg-slate-900 ${config.borderColor}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Verdict and Score */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold tracking-wide border ${config.badgeBg} ${config.textColor} ${config.borderColor}`}>
                <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                {config.label}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                MITRE ATT&CK: <span className="text-slate-200 font-semibold">{report.aiIntel.mitreTechnique}</span>
              </span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {report.aiIntel.threatType}
              </h1>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {report.aiIntel.executiveSummary}
              </p>
            </div>

            {/* Target URL inspection path */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-500 w-16 shrink-0">Giriş:</span>
                <span className="text-slate-300 truncate select-all">{initialDisplayUrl}</span>
              </div>
              {report.redirects.length > 0 && (
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-slate-500 w-16 shrink-0">Hedef:</span>
                  <span className="text-rose-400 font-semibold truncate select-all">{displayUrl}</span>
                  <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                    ({report.redirects.length} yönlendirme)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Risk Gauge Metric Card */}
          <div className="lg:col-span-4 p-5 bg-slate-950 border border-slate-800 rounded-lg text-center space-y-2">
            <div className="text-xs text-slate-400 font-medium">Toplam Tehdit Risk Skoru</div>
            <div className="flex items-baseline justify-center gap-1 font-mono">
              <span className={`text-4xl font-extrabold tabular-nums ${config.textColor}`}>
                {report.finalRiskScore}
              </span>
              <span className="text-slate-500 text-sm">/ 100</span>
            </div>

            {/* Risk Bar Gauge */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  report.finalRiskScore >= 75
                    ? 'bg-red-500'
                    : report.finalRiskScore >= 50
                    ? 'bg-rose-500'
                    : report.finalRiskScore >= 25
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(4, report.finalRiskScore)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500 font-mono tabular-nums">
              <span>0 (Temiz)</span>
              <span>50 (Şüpheli)</span>
              <span>100 (Kritik)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation for Detailed Inspection - Horizontally Scrollable on Mobile */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-px overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'overview'
              ? 'border-emerald-400 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Genel Bakış & Tehdit Bulguları ({report.heuristics.findings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('redirects')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'redirects'
              ? 'border-emerald-400 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Yönlendirme Zinciri ({report.redirects.length} Hop)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('intel')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'intel'
              ? 'border-emerald-400 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Yapay Zeka Savunma Raporu
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'headers'
              ? 'border-emerald-400 text-white font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Ağ & Güvenlik Başlıkları
        </button>
      </div>

      {/* Tab 1: Overview & Heuristics */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Attack Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Alan Adı & Protokol</div>
              <div className="text-sm font-semibold text-white font-mono truncate">
                {report.heuristics.domainInfo?.hostname || 'Belirlenemedi'}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                {report.heuristics.domainInfo?.protocol === 'https' ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-mono">
                    <Lock className="w-3 h-3" /> HTTPS
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-mono">
                    <Unlock className="w-3 h-3" /> HTTP (Şifresiz)
                  </span>
                )}
                <span>·</span>
                <span className="font-mono">Port: {report.heuristics.domainInfo?.port || '80/443'}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Marka & Typosquatting Durumu</div>
              <div className="text-sm font-semibold text-white truncate">
                {report.heuristics.matchedBrands && report.heuristics.matchedBrands.length > 0 ? (
                  <span className="text-rose-400">
                    Taklit Şüphesi: {report.heuristics.matchedBrands.join(', ')}
                  </span>
                ) : (
                  <span className="text-slate-300">Bilinen Marka Taklidi Yok</span>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-400 font-mono">
                TLD: <span className="text-slate-200">.{report.heuristics.domainInfo?.tld || 'bilinmiyor'}</span>
                {report.heuristics.domainInfo?.isPunycode && (
                  <span className="ml-2 text-rose-400 font-bold">· PUNYCODE AKTİF</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Entropi & DGA Karmaşıklığı</div>
              <div className="text-sm font-semibold text-white font-mono tabular-nums">
                {report.heuristics.domainInfo?.entropy || 0} bits/char
              </div>
              <div className="mt-2 text-xs text-slate-400">
                {Number(report.heuristics.domainInfo?.entropy || 0) > 3.8
                  ? 'Yüksek rastgelelik (Algoritmik Üretim Şüphesi)'
                  : 'Normal insani sözcük karmaşıklığı'}
              </div>
            </div>
          </div>

          {/* Detailed Findings Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              Sezgisel Güvenlik Kural Motoru Bulguları
            </h3>

            {report.heuristics.findings.length === 0 ? (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                Herhangi bir sezgisel anomali veya oltalama kuralı tetiklenmedi.
              </div>
            ) : (
              <div className="space-y-2.5">
                {report.heuristics.findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-start gap-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      {finding.severity === 'CRITICAL' ? (
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                      ) : finding.severity === 'HIGH' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : finding.severity === 'MEDIUM' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Globe className="w-4 h-4 text-sky-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white">
                          {finding.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span
                            className={
                              finding.severity === 'CRITICAL'
                                ? 'text-red-400'
                                : finding.severity === 'HIGH'
                                ? 'text-rose-400'
                                : finding.severity === 'MEDIUM'
                                ? 'text-amber-400'
                                : 'text-slate-400'
                            }
                          >
                            [{finding.severity}]
                          </span>
                          <span className="text-slate-500 tabular-nums">+{finding.scoreImpact} Risk</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {finding.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Redirect Chain */}
      {activeTab === 'redirects' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              HTTP Yönlendirme İzleme & Unshortener (Hop-by-Hop)
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              Toplam {report.redirects.length} adım tespit edildi
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Saldırganlar gerçek oltalama adresini gizlemek için genellikle t.co, bit.ly veya çok katmanlı yönlendirmeler kullanır. Aşağıda sistemin adım adım takip ettiği yönlendirme haritası yer almaktadır:
          </p>

          {report.redirects.length === 0 ? (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center text-xs text-slate-400">
              Doğrudan hedef bağlantıya ulaşıldı, herhangi bir ara yönlendirme (HTTP 301/302) gerçekleşmedi.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {report.redirects.map((hop) => (
                <div key={hop.hopNumber} className="relative group">
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-500 flex items-center justify-center text-[9px] font-mono font-bold text-white">
                    {hop.hopNumber}
                  </div>

                  <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-200 truncate">
                        {isDefanged ? defangUrl(hop.url) : hop.url}
                      </span>
                      <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            [301, 302, 307, 308].includes(hop.statusCode)
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                              : hop.statusCode === 200
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          HTTP {hop.statusCode || 'N/A'}
                        </span>
                        <span className="text-slate-500 text-[11px]">{hop.responseTimeMs} ms</span>
                      </div>
                    </div>

                    {hop.location && (
                      <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-900">
                        <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-slate-500 shrink-0">Yönlendirilen Hedef:</span>
                        <span className="text-slate-300 truncate">
                          {isDefanged ? defangUrl(hop.location) : hop.location}
                        </span>
                      </div>
                    )}

                    {hop.server && (
                      <div className="text-[11px] text-slate-500 font-mono">
                        Sunucu İmzası: <span className="text-slate-400">{hop.server}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {report.redirectError && (
            <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Yönlendirme Uyarısı: {report.redirectError}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: AI Threat Intelligence Briefing */}
      {activeTab === 'intel' && (
        <div className="space-y-4">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span>Gemini 3.8 Flash Tehdit İstihbarat Raporu</span>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white">Yönetici Güvenlik Özeti</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 border border-slate-800 rounded-lg">
                {report.aiIntel.executiveSummary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deceptive Elements */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <h5 className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Saptanan Aldatıcı & Zararlı Unsurlar
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {report.aiIntel.keyRisks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">·</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Actions */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <h5 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Önerilen Savunma & Müdahale Adımları
                </h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {report.aiIntel.recommendedActions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Network & Security Headers */}
      {activeTab === 'headers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            Ağ & Güvenlik Başlıkları Denetimi
          </h3>
          <p className="text-xs text-slate-400">
            Hedef sunucunun kurumsal siber güvenlik standartlarına (HSTS, CSP, Anti-Clickjacking) uyumu denetlendi:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">Strict-Transport-Security (HSTS)</span>
                <p className="text-[11px] text-slate-500">Zorunlu şifreli bağlantı politikası</p>
              </div>
              <span
                className={`font-mono font-semibold ${
                  report.pageContent?.securityHeaders.hsts ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {report.pageContent?.securityHeaders.hsts ? 'ETKİN' : 'YOK'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">Content-Security-Policy (CSP)</span>
                <p className="text-[11px] text-slate-500">XSS ve izinsiz script enjeksiyon kalkanı</p>
              </div>
              <span
                className={`font-mono font-semibold ${
                  report.pageContent?.securityHeaders.csp ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {report.pageContent?.securityHeaders.csp ? 'ETKİN' : 'YOK'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">X-Frame-Options</span>
                <p className="text-[11px] text-slate-500">Clickjacking iframe koruması</p>
              </div>
              <span className="font-mono text-slate-300">
                {report.pageContent?.securityHeaders.xFrameOptions || 'Tanımlanmamış'}
              </span>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200">Content-Type</span>
                <p className="text-[11px] text-slate-500">Dönen içerik MIME tipi</p>
              </div>
              <span className="font-mono text-slate-300 truncate max-w-44 text-right">
                {report.pageContent?.contentType || 'Bilinmiyor'}
              </span>
            </div>
          </div>

          {report.pageContent?.title && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400">Çekilen Sayfa Başlığı (HTML Title):</span>
              <div className="text-xs font-semibold text-white mt-1">
                "{report.pageContent.title}"
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
