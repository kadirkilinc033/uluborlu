import jsQR from 'jsqr';
import { ThreatLevel } from '../types';

export function defangUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//i, (match) => (match.toLowerCase().startsWith('https') ? 'hxxps[://]' : 'hxxp[://]'))
    .replace(/\./g, '[.]');
}

export function refangUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/^hxxps\[:\/\/\]/i, 'https://')
    .replace(/^hxxp\[:\/\/\]/i, 'http://')
    .replace(/\[\.\]/g, '.');
}

export async function decodeQrFromImageFile(file: File): Promise<{
  text: string;
  dataUrl: string;
} | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          resolve({ text: code.data, dataUrl });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı.'));
    reader.readAsDataURL(file);
  });
}

export function getThreatLevelConfig(level: ThreatLevel): {
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
} {
  switch (level) {
    case 'CRITICAL':
      return {
        label: 'KRİTİK ZARARLI',
        badgeBg: 'bg-red-950/60',
        textColor: 'text-red-400',
        borderColor: 'border-red-600/50',
        dotColor: 'bg-red-500',
      };
    case 'HIGH':
      return {
        label: 'YÜKSEK TEHDİT',
        badgeBg: 'bg-rose-950/60',
        textColor: 'text-rose-400',
        borderColor: 'border-rose-600/50',
        dotColor: 'bg-rose-500',
      };
    case 'MEDIUM':
      return {
        label: 'ŞÜPHELİ / RİSKLİ',
        badgeBg: 'bg-amber-950/60',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-600/50',
        dotColor: 'bg-amber-500',
      };
    case 'LOW':
      return {
        label: 'DÜŞÜK RİSK',
        badgeBg: 'bg-sky-950/60',
        textColor: 'text-sky-400',
        borderColor: 'border-sky-600/50',
        dotColor: 'bg-sky-500',
      };
    case 'SAFE':
    default:
      return {
        label: 'GÜVENLİ / TEMİZ',
        badgeBg: 'bg-emerald-950/60',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-600/50',
        dotColor: 'bg-emerald-500',
      };
  }
}

export interface PresetSample {
  id: string;
  title: string;
  type: 'SAFE' | 'QUISHING' | 'TYPOSQUATTING' | 'IP_HOST' | 'SHORTENER';
  tag: string;
  url: string;
  description: string;
}

export const PRESET_SAMPLES: PresetSample[] = [
  {
    id: 's-isbank',
    title: 'Resmi Bankacılık Portalı',
    type: 'SAFE',
    tag: 'Güvenli Referans',
    url: 'https://www.isbank.com.tr',
    description: 'Meşru SSL sertifikalı, bilinen resmi Türk bankası web sitesi.',
  },
  {
    id: 's-shortener',
    title: 'Maskeli Kısaltılmış Link',
    type: 'SHORTENER',
    tag: 'Yönlendirme Maskeleme',
    url: 'https://bit.ly/42sample-test',
    description: 'URL kısaltıcı arkasına gizlenmiş ve hedefi gizleyen yönlendirme simülasyonu.',
  },
  {
    id: 's-typo',
    title: 'Garanti BBVA Taklidi (Typosquatting)',
    type: 'TYPOSQUATTING',
    tag: 'Marka Taklidi',
    url: 'http://garanti-online-giris-onay.xyz/login.php?hesap=dogrulama',
    description: 'Banka adı kullanılarak oluşturulmuş yüksek riskli .xyz oltalama bağlantısı.',
  },
  {
    id: 's-puny',
    title: 'Punycode Homograf Saldırısı',
    type: 'TYPOSQUATTING',
    tag: 'IDN Homograf Tuzağı',
    url: 'http://xn--gogle-p7a.com/signin/v2/challenge',
    description: 'Kiril alfabesi karakterleri ile Google alan adını taklit eden punycode adresi.',
  },
  {
    id: 's-ip',
    title: 'Ham IP Üzerinden Giriş',
    type: 'IP_HOST',
    tag: 'Doğrudan IP Tuzağı',
    url: 'http://185.193.66.42:8080/auth/edevlet-giris',
    description: 'Standart dışı port kullanan ve kurumsal alan adı olmayan ham IP adresi.',
  },
  {
    id: 's-quishing',
    title: 'Fatura & Ceza Quishing Tuzağı',
    type: 'QUISHING',
    tag: 'Fiziksel QR Oltalama',
    url: 'https://hgs-ceza-sorgulama-odeme.click/fatura-ode',
    description: 'Otopark veya SMS fatura tuzaklarında kullanılan sahte HGS ödeme bağlantısı.',
  },
];
