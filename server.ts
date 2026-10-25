import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Known brand domain definitions for typosquatting & impersonation checks
const MONITORED_BRANDS = [
  { name: 'Google', domains: ['google.com', 'google.com.tr', 'accounts.google.com'] },
  { name: 'Microsoft', domains: ['microsoft.com', 'live.com', 'outlook.com', 'office.com'] },
  { name: 'Apple', domains: ['apple.com', 'icloud.com'] },
  { name: 'e-Devlet Kapısı', domains: ['turkiye.gov.tr', 'edevlet.gov.tr'] },
  { name: 'Gelir İdaresi (GİB)', domains: ['gib.gov.tr', 'ivd.gib.gov.tr'] },
  { name: 'e-Nabız', domains: ['enabiz.gov.tr'] },
  { name: 'PTT / PTT Kargo', domains: ['ptt.gov.tr', 'gonderitakip.ptt.gov.tr'] },
  { name: 'Garanti BBVA', domains: ['garantibbva.com.tr', 'garanti.com.tr'] },
  { name: 'İş Bankası', domains: ['isbank.com.tr'] },
  { name: 'Ziraat Bankası', domains: ['ziraatbank.com.tr'] },
  { name: 'Akbank', domains: ['akbank.com'] },
  { name: 'Yapı Kredi', domains: ['yapikredi.com.tr'] },
  { name: 'Vakıfbank', domains: ['vakifbank.com.tr'] },
  { name: 'Halkbank', domains: ['halkbank.com.tr'] },
  { name: 'QNB Finansbank', domains: ['qnbfinansbank.com', 'qnb.com.tr'] },
  { name: 'Papara', domains: ['papara.com'] },
  { name: 'PayPal', domains: ['paypal.com'] },
  { name: 'Amazon', domains: ['amazon.com', 'amazon.com.tr'] },
  { name: 'Netflix', domains: ['netflix.com'] },
  { name: 'Instagram', domains: ['instagram.com'] },
  { name: 'WhatsApp', domains: ['whatsapp.com', 'wa.me'] },
  { name: 'Telegram', domains: ['telegram.org', 't.me'] },
  { name: 'Trendyol', domains: ['trendyol.com'] },
  { name: 'Hepsiburada', domains: ['hepsiburada.com'] },
  { name: 'Sahibinden', domains: ['sahibinden.com'] },
  { name: 'Turkcell', domains: ['turkcell.com.tr'] },
  { name: 'Türk Telekom', domains: ['turktelekom.com.tr'] },
  { name: 'Vodafone', domains: ['vodafone.com.tr'] },
  { name: 'Binance', domains: ['binance.com', 'binance.tr'] },
  { name: 'MetaMask', domains: ['metamask.io'] },
];

const SUSPICIOUS_TLDS = new Set([
  'xyz', 'top', 'tk', 'ml', 'ga', 'cf', 'gq', 'buzz', 'work', 'click', 'rest',
  'country', 'stream', 'gdn', 'fit', 'link', 'surf', 'loan', 'racing', 'download',
  'accountant', 'date', 'faith', 'review', 'party', 'win', 'vip', 'monster', 'icu'
]);

const SHORTENER_DOMAINS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'ow.ly', 'buff.ly',
  'rebrand.ly', 'shorturl.at', 'rb.gy', 'v.gd', 'qr.ae', 'goo.gl', 'bl.ink', 'cli.re'
]);

const PHISHING_KEYWORDS = [
  'login', 'signin', 'log-in', 'sign-in', 'giris', 'hesap', 'onay', 'dogrulama',
  'guncelle', 'guncelleme', 'fatura', 'odeme', 'ceza', 'hgs', 'aidat', 'iade',
  'kazandiniz', 'hediye', 'guvenlik', 'password', 'parola', 'sifre', 'otp',
  'sms-kod', 'verify', 'verification', 'secure', 'account', 'banking', 'update',
  'wallet', 'recovery', 'airdrop', 'claim', 'gift', 'award', 'bonus', 'tebrikler'
];

// Levenshtein distance helper
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let i = 0; i <= bn; ++i) matrix[i][0] = i;
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion / deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

// Shannon Entropy calculation for domain randomness
function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(3));
}

// Trace redirects safely with strict limits
interface RedirectHop {
  hopNumber: number;
  url: string;
  statusCode: number;
  location?: string;
  server?: string;
  responseTimeMs: number;
}

async function traceRedirectChain(initialUrl: string, maxHops: number = 8): Promise<{
  chain: RedirectHop[];
  finalUrl: string;
  error?: string;
}> {
  const chain: RedirectHop[] = [];
  let currentUrl = initialUrl;
  const visited = new Set<string>();

  for (let hop = 1; hop <= maxHops; hop++) {
    if (visited.has(currentUrl)) {
      return {
        chain,
        finalUrl: currentUrl,
        error: 'Sonsuz yönlendirme döngüsü (Redirect Loop) tespit edildi.'
      };
    }
    visited.add(currentUrl);

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      const status = response.status;
      const location = response.headers.get('location');
      const server = response.headers.get('server') || undefined;

      chain.push({
        hopNumber: hop,
        url: currentUrl,
        statusCode: status,
        location: location || undefined,
        server,
        responseTimeMs: elapsed,
      });

      // Check if redirect
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        let nextUrl: string;
        try {
          nextUrl = new URL(location, currentUrl).href;
        } catch {
          nextUrl = location;
        }
        currentUrl = nextUrl;
      } else {
        // Reached final destination
        return { chain, finalUrl: currentUrl };
      }
    } catch (err: any) {
      chain.push({
        hopNumber: hop,
        url: currentUrl,
        statusCode: 0,
        responseTimeMs: Date.now() - startTime,
      });
      return {
        chain,
        finalUrl: currentUrl,
        error: err.name === 'AbortError' ? 'Bağlantı zaman aşımına uğradı (4.5s)' : `Ağ sorgu hatası: ${err.message || 'Bağlanılamadı'}`
      };
    }
  }

  return {
    chain,
    finalUrl: currentUrl,
    error: 'Maksimum yönlendirme adım sayısına (8) ulaşıldı.'
  };
}

// Safe page metadata & header inspection
async function inspectPageContent(targetUrl: string): Promise<{
  title?: string;
  metaDescription?: string;
  contentType?: string;
  contentLength?: string;
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xFrameOptions: string | null;
    xContentTypeOptions: string | null;
  };
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    const contentLength = res.headers.get('content-length') || '';
    const hsts = Boolean(res.headers.get('strict-transport-security'));
    const csp = Boolean(res.headers.get('content-security-policy'));
    const xFrameOptions = res.headers.get('x-frame-options');
    const xContentTypeOptions = res.headers.get('x-content-type-options');

    let title: string | undefined;
    let metaDescription: string | undefined;

    if (contentType.includes('text/html')) {
      const text = await res.text();
      // Slice first 50KB to avoid heavy regex
      const snippet = text.slice(0, 50000);
      const titleMatch = snippet.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
      const descMatch = snippet.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        metaDescription = descMatch[1].trim();
      }
    }

    return {
      title,
      metaDescription,
      contentType,
      contentLength,
      securityHeaders: {
        hsts,
        csp,
        xFrameOptions,
        xContentTypeOptions,
      },
    };
  } catch {
    return {
      securityHeaders: {
        hsts: false,
        csp: false,
        xFrameOptions: null,
        xContentTypeOptions: null,
      },
    };
  }
}

// Deterministic heuristic analyzer
interface HeuristicFinding {
  code: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  scoreImpact: number;
  description: string;
}

function evaluateHeuristics(parsedUrl: URL, rawInput: string): {
  findings: HeuristicFinding[];
  heuristicRiskScore: number;
  domainInfo: {
    hostname: string;
    protocol: string;
    port: string;
    tld: string;
    subdomains: string[];
    entropy: number;
    isIpAddress: boolean;
    isPunycode: boolean;
    decodedPunycode?: string;
  };
  matchedBrands: string[];
} {
  const findings: HeuristicFinding[] = [];
  let riskScore = 0;

  const hostname = parsedUrl.hostname.toLowerCase();
  const protocol = parsedUrl.protocol.replace(':', '').toLowerCase();
  const port = parsedUrl.port || (protocol === 'https' ? '443' : '80');
  const fullPath = (parsedUrl.pathname + parsedUrl.search).toLowerCase();

  // 1. Protocol check
  if (protocol === 'http') {
    findings.push({
      code: 'INSECURE_PROTOCOL_HTTP',
      title: 'Şifresiz HTTP İletişimi',
      severity: 'MEDIUM',
      scoreImpact: 20,
      description: 'Bağlantı şifresiz HTTP protokolü kullanıyor. Veriler aradaki dinleyiciler (MitM) tarafından okunabilir veya değiştirilebilir.',
    });
    riskScore += 20;
  }

  // 2. Non-standard ports
  if (!['80', '443', ''].includes(port)) {
    findings.push({
      code: 'NON_STANDARD_PORT',
      title: `Standart Dışı Port (: ${port})`,
      severity: 'HIGH',
      scoreImpact: 25,
      description: `Bağlantı standart web portları (80/443) yerine ${port} portunu hedefliyor. Oltalama kitleri ve gizli arka kapı sunucuları sıklıkla bu yönteme başvurur.`,
    });
    riskScore += 25;
  }

  // 3. IP address check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const isIp = ipv4Regex.test(hostname);
  if (isIp) {
    findings.push({
      code: 'RAW_IP_HOSTNAME',
      title: 'Doğrudan IP Adresi Tespiti',
      severity: 'CRITICAL',
      scoreImpact: 40,
      description: `Alan adı yerine doğrudan ham IP adresi (${hostname}) kullanılmış. Meşru kurumlar IP adresiyle doğrudan kimlik doğrulama veya işlem bağlantısı dağıtmaz.`,
    });
    riskScore += 40;
  }

  // 4. Punycode & IDN Homograph check
  const isPunycode = hostname.startsWith('xn--') || hostname.includes('.xn--');
  let decodedPunycode: string | undefined;
  if (isPunycode) {
    try {
      // Decode unicode url if browser/node supports URL unicode or via simple punycode note
      decodedPunycode = new URL(parsedUrl.href).hostname;
    } catch {
      decodedPunycode = hostname;
    }
    findings.push({
      code: 'PUNYCODE_HOMOGRAPH_ATTACK',
      title: 'Punycode / IDN Homograf Tehdidi',
      severity: 'CRITICAL',
      scoreImpact: 45,
      description: 'Alan adı uluslararası karakter kodlaması (Punycode `xn--`) içeriyor. Benzer görünen harflerle (ör. Kiril veya Yunan alfabesi) kullanıcıyı yanıltarak marka taklidi yapılabilir.',
    });
    riskScore += 45;
  }

  // Check for embedded '@' trick in raw URL
  if (rawInput.includes('@') && rawInput.indexOf('@') < rawInput.indexOf('/', 8)) {
    findings.push({
      code: 'EMBEDDED_AT_SYMBOL',
      title: 'Kullanıcı Bilgisiyle Gizlenmiş URL (@ Belirteci)',
      severity: 'CRITICAL',
      scoreImpact: 40,
      description: 'URL içinde `@` karakteri kullanılarak meşru bir site adı sahte bir hedef gibi gösterilmiş, tarayıcı ise `@` sonrasındaki asıl zararlı sunucuya gitmektedir.',
    });
    riskScore += 40;
  }

  // 5. TLD analysis
  const domainParts = hostname.split('.');
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
  const subdomains = domainParts.slice(0, Math.max(0, domainParts.length - 2));

  if (SUSPICIOUS_TLDS.has(tld)) {
    findings.push({
      code: 'HIGH_RISK_TLD',
      title: `Yüksek Riskli Üst Düzey Alan Adı (.${tld})`,
      severity: 'HIGH',
      scoreImpact: 30,
      description: `.${tld} uzantısı, düşük kayıt maliyetleri ve gevşek denetim sebebiyle siber saldırganlar ve spam kampanyaları tarafından yüksek oranda tercih edilmektedir.`,
    });
    riskScore += 30;
  }

  // 6. Excessive subdomains
  if (subdomains.length >= 3) {
    findings.push({
      code: 'EXCESSIVE_SUBDOMAINS',
      title: 'Aşırı Alt Alan Adı Katmanı (Subdomain Stacking)',
      severity: 'MEDIUM',
      scoreImpact: 20,
      description: `Hedef adreste ${subdomains.length} adet alt alan adı katmanı tespit edildi (${subdomains.join('.')}). Bu yapı güvenli marka isimlerini adres çubuğunun başına yerleştirip asıl hedefi gizlemek için kullanılır.`,
    });
    riskScore += 20;
  }

  // 7. Shannon Entropy / DGA check
  const sld = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : hostname;
  const entropy = calculateEntropy(sld);
  if (entropy > 3.8 && sld.length > 10) {
    findings.push({
      code: 'HIGH_DOMAIN_ENTROPY_DGA',
      title: 'Rastgele Üretilmiş Alan Adı (DGA Şüphesi)',
      severity: 'HIGH',
      scoreImpact: 25,
      description: `Alan adının karakter karmaşıklığı (Entropi: ${entropy}) çok yüksek. Zararlı yazılım komuta-kontrol sunucuları (C2) ve tek kullanımlık oltalama siteleri için oluşturulmuş olabilir.`,
    });
    riskScore += 25;
  }

  // 8. Typosquatting and Brand Impersonation Detection
  const matchedBrands: string[] = [];
  const baseDomain = domainParts.slice(-2).join('.');

  for (const brand of MONITORED_BRANDS) {
    const brandLower = brand.name.toLowerCase();
    const isOfficial = brand.domains.some(d => hostname === d || hostname.endsWith('.' + d));

    // Check if brand name is mentioned in host or path while NOT being official
    const mentionsBrandInHost = hostname.includes(brandLower.replace(/[^a-z0-9]/g, '')) ||
      hostname.replace(/[-_.]/g, '').includes(brandLower.replace(/[^a-z0-9]/g, ''));

    if (!isOfficial && mentionsBrandInHost) {
      matchedBrands.push(brand.name);
      findings.push({
        code: 'BRAND_IMPERSONATION',
        title: `${brand.name} Marka Taklidi Şüphesi`,
        severity: 'CRITICAL',
        scoreImpact: 45,
        description: `Adres meşru ${brand.name} alan adı (${brand.domains.join(', ')}) OLMAMASINA rağmen, alan adında '${brand.name}' markasını barındırmaktadır. Bu durum tipik bir kimlik avı (phishing) göstergesidir.`,
      });
      riskScore += 45;
      break;
    }

    // Levenshtein distance check against main domain
    if (!isOfficial) {
      for (const officialDomain of brand.domains) {
        const officialSld = officialDomain.split('.')[0];
        const dist = levenshtein(sld, officialSld);
        if (dist === 1 || (dist === 2 && sld.length > 6)) {
          matchedBrands.push(brand.name);
          findings.push({
            code: 'TYPOSQUATTING_DETECTED',
            title: `Yazım Hatası Tuzağı (Typosquatting: ${brand.name})`,
            severity: 'CRITICAL',
            scoreImpact: 40,
            description: `'${sld}' adı, resmi '${officialSld}' alan adına 1-2 harf farkla aşırı derecede benzemektedir. Kullanıcıların yazım hatalarından faydalanma amacı taşır.`,
          });
          riskScore += 40;
          break;
        }
      }
    }
  }

  // 9. Phishing & Harvesting Keywords in path / query / subdomain
  const foundKeywords: string[] = [];
  for (const kw of PHISHING_KEYWORDS) {
    if (fullPath.includes(kw) || subdomains.some(s => s.includes(kw))) {
      foundKeywords.push(kw);
    }
  }
  if (foundKeywords.length > 0) {
    const isCritical = foundKeywords.length >= 2 || foundKeywords.some(k => ['login', 'sifre', 'parola', 'password', 'otp', 'hgs'].includes(k));
    findings.push({
      code: 'PHISHING_KEYWORDS_FOUND',
      title: 'Kimlik Avı / Giriş Tuzağı Anahtar Kelimeleri',
      severity: isCritical ? 'HIGH' : 'MEDIUM',
      scoreImpact: isCritical ? 25 : 15,
      description: `URL yolu ve parametrelerinde hassas kimlik bilgisi toplama göstergeleri saptandı: [${foundKeywords.slice(0, 5).join(', ')}].`,
    });
    riskScore += isCritical ? 25 : 15;
  }

  // 10. URL Shortener check
  if (SHORTENER_DOMAINS.has(hostname)) {
    findings.push({
      code: 'URL_SHORTENER_MASK',
      title: 'Kısaltılmış Bağlantı / Hedef Maskeleme',
      severity: 'MEDIUM',
      scoreImpact: 20,
      description: `Bağlantı popüler bir URL kısaltma servisi (${hostname}) üzerinden yönlendiriliyor. Asıl hedef alan adını QR veya mesajda gizlemek amacıyla kullanılmış olabilir.`,
    });
    riskScore += 20;
  }

  // Cap score between 0 and 100
  const normalizedRiskScore = Math.min(100, Math.max(0, riskScore));

  return {
    findings,
    heuristicRiskScore: normalizedRiskScore,
    domainInfo: {
      hostname,
      protocol,
      port,
      tld,
      subdomains,
      entropy,
      isIpAddress: isIp,
      isPunycode,
      decodedPunycode,
    },
    matchedBrands,
  };
}

// AI Threat Intelligence generator via Gemini
async function generateAiThreatIntel(payload: {
  url: string;
  finalUrl: string;
  redirects: RedirectHop[];
  heuristics: ReturnType<typeof evaluateHeuristics>;
  pageContent: Awaited<ReturnType<typeof inspectPageContent>>;
}) {
  if (!ai) {
    return {
      threatLevel: payload.heuristics.heuristicRiskScore >= 70 ? 'CRITICAL' : payload.heuristics.heuristicRiskScore >= 40 ? 'HIGH' : payload.heuristics.heuristicRiskScore >= 20 ? 'MEDIUM' : 'SAFE',
      riskScore: payload.heuristics.heuristicRiskScore,
      threatType: payload.heuristics.heuristicRiskScore >= 40 ? 'Potansiyel Oltalama / Quishing' : 'Temiz Görünüm',
      mitreTechnique: 'T1566.002 - Spearphishing Link',
      executiveSummary: 'Yerel sezgisel analiz tamamlandı. Google Gemini API anahtarı ayarlanmadığı için ileri seviye siber tehdit istihbaratı sezgisel kurallara dayanmaktadır.',
      keyRisks: payload.heuristics.findings.map(f => f.title),
      recommendedActions: [
        'Bağlantıya doğrudan tıklamaktan veya QR kodu taramaktan kaçının.',
        'Resmi web sitesine doğrudan arama motoru üzerinden veya yer imlerinizden erişin.',
        'Asla SMS onay kodu veya banka giriş şifresi girmeyin.'
      ]
    };
  }

  const prompt = `Sen kıdemli bir Siber Güvenlik ve Tehdit İstihbaratı (Cyber Threat Intelligence / SOC) Analistisin.
Aşağıda taranan QR kod / URL bağlantısına ait teknik telemetri verileri yer almaktadır:

İLK GİRİLEN BAĞLANTI: ${payload.url}
NİHAİ VARIŞ BAĞLANTISI (Yönlendirmeler Sonrası): ${payload.finalUrl}
TOPLAM YÖNLENDİRME (HOP) SAYISI: ${payload.redirects.length}
YÖNLENDİRME ZİNCİRİ: ${JSON.stringify(payload.redirects.map(r => ({ hop: r.hopNumber, url: r.url, code: r.statusCode })))}

ALAN ADI ANALİZİ:
- Hostname: ${payload.heuristics.domainInfo.hostname}
- Protokol: ${payload.heuristics.domainInfo.protocol}
- TLD: .${payload.heuristics.domainInfo.tld}
- IP Adresi mi: ${payload.heuristics.domainInfo.isIpAddress}
- Punycode / IDN mi: ${payload.heuristics.domainInfo.isPunycode}
- Alan Adı Entropisi: ${payload.heuristics.domainInfo.entropy}

SEZGİSEL BULGULAR:
${payload.heuristics.findings.map(f => `- [${f.severity}] ${f.title}: ${f.description}`).join('\n')}

SAYFA İÇERİK VERİLERİ:
- Sayfa Başlığı: ${payload.pageContent.title || 'Başlık alınamadı'}
- Content-Type: ${payload.pageContent.contentType || 'Bilinmiyor'}
- HSTS Güvenliği: ${payload.pageContent.securityHeaders.hsts ? 'Aktif' : 'Pasif'}
- CSP Güvenliği: ${payload.pageContent.securityHeaders.csp ? 'Aktif' : 'Pasif'}

GÖREV:
Bu verileri derinlemesine analiz ederek Türkçe siber tehdit değerlendirmesi yap.
Yanıtını MUTLAKA aşağıdaki JSON şemasına uygun olarak üret:
{
  "threatLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "SAFE",
  "riskScore": number (0 ile 100 arası),
  "threatType": string (ör. "Quishing (QR Oltalama)", "Marka Taklidi & Kimlik Avı", "Zararlı Yazılım Dağıtımı", "Temiz & Doğrulanmış"),
  "mitreTechnique": string (ör. "T1566.002 - Spearphishing Link", "T1204.001 - Malicious Link", "Yok"),
  "executiveSummary": string (Kullanıcıya veya SOC analistine yönelik 2-3 cümlelik net siber istihbarat özeti),
  "keyRisks": string[] (En belirgin 2-4 aldatmaca veya risk faktörü),
  "recommendedActions": string[] (Kullanıcının atması gereken 2-4 somut koruma adımı)
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            threatLevel: { type: Type.STRING },
            riskScore: { type: Type.NUMBER },
            threatType: { type: Type.STRING },
            mitreTechnique: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            keyRisks: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ['threatLevel', 'riskScore', 'threatType', 'mitreTechnique', 'executiveSummary', 'keyRisks', 'recommendedActions']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return parsed;
  } catch (err: any) {
    console.error('Gemini AI analysis error:', err);
    return {
      threatLevel: payload.heuristics.heuristicRiskScore >= 70 ? 'CRITICAL' : payload.heuristics.heuristicRiskScore >= 40 ? 'HIGH' : payload.heuristics.heuristicRiskScore >= 20 ? 'MEDIUM' : 'SAFE',
      riskScore: payload.heuristics.heuristicRiskScore,
      threatType: payload.heuristics.heuristicRiskScore >= 40 ? 'Potansiyel Tehdit' : 'Temiz / Düşük Risk',
      mitreTechnique: 'T1566.002 - Spearphishing Link',
      executiveSummary: 'Yapay zeka analizi yedek kural motoru ile değerlendirildi. Alan adı ve yönlendirme parametreleri incelendi.',
      keyRisks: payload.heuristics.findings.map(f => f.title),
      recommendedActions: [
        'Bağlantının doğruluğunu güvenilir kanallardan teyit edin.',
        'Hassas verilerinizi bilinmeyen bağlantılarla paylaşmayın.'
      ]
    };
  }
}

// Full Analysis API endpoint
app.post('/api/analyze-link', async (req: Request, res: Response): Promise<void> => {
  try {
    const { input, source = 'manual' } = req.body;
    if (!input || typeof input !== 'string') {
      res.status(400).json({ error: 'Geçersiz analiz girdisi. Lütfen bir URL veya QR payload girin.' });
      return;
    }

    const trimmedInput = input.trim();

    // Check payload type
    let payloadType = 'URL';
    let targetUrlString = trimmedInput;

    if (trimmedInput.startsWith('WIFI:')) {
      payloadType = 'WIFI';
    } else if (trimmedInput.startsWith('BEGIN:VCARD')) {
      payloadType = 'VCARD';
    } else if (trimmedInput.startsWith('SMSTO:') || trimmedInput.startsWith('sms:')) {
      payloadType = 'SMS';
    } else if (trimmedInput.startsWith('tel:')) {
      payloadType = 'TEL';
    } else if (trimmedInput.startsWith('mailto:')) {
      payloadType = 'MAILTO';
    }

    // If not standard URL schema, add https:// if it looks like a domain
    if (payloadType === 'URL') {
      if (!/^https?:\/\//i.test(trimmedInput)) {
        if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmedInput)) {
          targetUrlString = 'https://' + trimmedInput;
        }
      }
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(targetUrlString);
    } catch {
      // Non-URL payload (e.g. text or invalid url)
      if (payloadType === 'URL') {
        res.status(400).json({ error: 'Girilen metin geçerli bir web adresi veya desteklenen QR protokolü değil.' });
        return;
      }
    }

    // If it's a non-URL payload (like WIFI or SMS), handle accordingly
    if (payloadType !== 'URL' || !parsedUrl) {
      res.json({
        id: 'scan-' + Date.now(),
        timestamp: new Date().toISOString(),
        input: trimmedInput,
        payloadType,
        source,
        finalUrl: trimmedInput,
        redirects: [],
        domainInfo: null,
        heuristics: {
          findings: [{
            code: 'NON_URL_PAYLOAD',
            title: `${payloadType} Formatında QR Kodu`,
            severity: 'INFO',
            scoreImpact: 0,
            description: `Bu QR kodu bir web adresi yerine ${payloadType} veri yapısı içermektedir.`
          }],
          heuristicRiskScore: 0,
        },
        pageContent: null,
        aiIntel: {
          threatLevel: 'SAFE',
          riskScore: 0,
          threatType: `${payloadType} Verisi`,
          mitreTechnique: 'Yok',
          executiveSummary: `QR kodu standart ${payloadType} veri taşıyıcısıdır. Doğrudan zararlı bir web yönlendirmesi içermemektedir.`,
          keyRisks: ['QR içeriğinin güvenilir bir kaynaktan alındığından emin olun.'],
          recommendedActions: ['Veriyi cihazınıza uygulamadan önce içeriği gözden geçirin.']
        }
      });
      return;
    }

    // 1. Trace redirects to final destination
    const redirectTrace = await traceRedirectChain(targetUrlString);
    const finalUrlString = redirectTrace.finalUrl;
    let finalParsedUrl = parsedUrl;
    try {
      finalParsedUrl = new URL(finalUrlString);
    } catch {
      finalParsedUrl = parsedUrl;
    }

    // 2. Evaluate heuristics on both initial and final domain
    const initialHeuristics = evaluateHeuristics(parsedUrl, trimmedInput);
    const finalHeuristics = evaluateHeuristics(finalParsedUrl, finalUrlString);

    // Merge findings and take highest severity
    const mergedFindingsMap = new Map<string, HeuristicFinding>();
    for (const f of [...initialHeuristics.findings, ...finalHeuristics.findings]) {
      mergedFindingsMap.set(f.code, f);
    }
    const combinedFindings = Array.from(mergedFindingsMap.values());
    const combinedScore = Math.max(initialHeuristics.heuristicRiskScore, finalHeuristics.heuristicRiskScore);

    const heuristicsResult = {
      findings: combinedFindings,
      heuristicRiskScore: combinedScore,
      domainInfo: finalHeuristics.domainInfo,
      matchedBrands: Array.from(new Set([...initialHeuristics.matchedBrands, ...finalHeuristics.matchedBrands])),
    };

    // 3. Inspect page headers & content safely
    const pageContent = await inspectPageContent(finalUrlString);

    // 4. Run AI Threat Intelligence via Gemini
    const aiIntel = await generateAiThreatIntel({
      url: targetUrlString,
      finalUrl: finalUrlString,
      redirects: redirectTrace.chain,
      heuristics: heuristicsResult,
      pageContent,
    });

    // 5. Final combined threat score calculation
    const finalRiskScore = Math.round(
      Math.max(heuristicsResult.heuristicRiskScore * 0.5 + (aiIntel.riskScore || 0) * 0.5, heuristicsResult.heuristicRiskScore)
    );

    let finalThreatLevel = 'SAFE';
    if (finalRiskScore >= 75) finalThreatLevel = 'CRITICAL';
    else if (finalRiskScore >= 50) finalThreatLevel = 'HIGH';
    else if (finalRiskScore >= 25) finalThreatLevel = 'MEDIUM';
    else if (finalRiskScore >= 10) finalThreatLevel = 'LOW';

    res.json({
      id: 'scan-' + Date.now(),
      timestamp: new Date().toISOString(),
      input: trimmedInput,
      targetUrl: targetUrlString,
      finalUrl: finalUrlString,
      payloadType: 'URL',
      source,
      redirects: redirectTrace.chain,
      redirectError: redirectTrace.error,
      heuristics: heuristicsResult,
      pageContent,
      finalRiskScore,
      finalThreatLevel,
      aiIntel: {
        ...aiIntel,
        riskScore: finalRiskScore,
        threatLevel: finalThreatLevel,
      },
    });
  } catch (err: any) {
    console.error('Scan endpoint error:', err);
    res.status(500).json({ error: 'Analiz sırasında beklenmeyen bir hata oluştu: ' + (err.message || 'Bilinmeyen hata') });
  }
});

// Batch Analysis endpoint
app.post('/api/analyze-batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: 'Lütfen analiz edilecek URL dizisi gönderin.' });
      return;
    }

    const limitedUrls = urls.slice(0, 20); // Cap at 20 for latency safety
    const results = await Promise.all(
      limitedUrls.map(async (rawUrl: string) => {
        try {
          const trimmed = (rawUrl || '').trim();
          if (!trimmed) return null;
          let parsed: URL;
          try {
            parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed);
          } catch {
            return {
              url: trimmed,
              error: 'Geçersiz URL formatı',
              riskScore: 0,
              threatLevel: 'UNKNOWN',
            };
          }

          const heuristics = evaluateHeuristics(parsed, trimmed);
          const redirect = await traceRedirectChain(parsed.href, 4);

          let threatLevel = 'SAFE';
          if (heuristics.heuristicRiskScore >= 70) threatLevel = 'CRITICAL';
          else if (heuristics.heuristicRiskScore >= 40) threatLevel = 'HIGH';
          else if (heuristics.heuristicRiskScore >= 20) threatLevel = 'MEDIUM';

          return {
            url: trimmed,
            finalUrl: redirect.finalUrl,
            hopCount: redirect.chain.length,
            riskScore: heuristics.heuristicRiskScore,
            threatLevel,
            findingsCount: heuristics.findings.length,
            matchedBrands: heuristics.matchedBrands,
            hostname: parsed.hostname,
          };
        } catch (err: any) {
          return {
            url: rawUrl,
            error: err.message || 'Sorgu hatası',
            riskScore: 0,
            threatLevel: 'UNKNOWN',
          };
        }
      })
    );

    res.json({
      total: limitedUrls.length,
      timestamp: new Date().toISOString(),
      results: results.filter(Boolean),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Toplu analiz hatası: ' + err.message });
  }
});

// Production static serving & Vite Dev Server middleware
async function setupServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
});
