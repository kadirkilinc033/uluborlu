import React, { useState } from 'react';
import { ShieldAlert, BookOpen, AlertCircle, CheckCircle2, ChevronRight, Lock, Eye, AlertTriangle } from 'lucide-react';

interface ThreatVector {
  id: string;
  title: string;
  category: string;
  mitre: string;
  summary: string;
  attackMechanism: string;
  realWorldScenario: string;
  defenseAction: string;
}

const THREAT_VECTORS: ThreatVector[] = [
  {
    id: 'quishing-parking',
    title: 'Fiziksel Otopark & Şarj İstasyonu Etiket Değişimi',
    category: 'Fiziksel / Sosyal Mühendislik',
    mitre: 'T1204.001 - Malicious Link',
    summary: 'Saldırganlar belediye otopark otomatları veya elektrikli araç şarj üniteleri üzerindeki orijinal QR kodların üzerine kendi sahte ödeme etiketlerini yapıştırır.',
    attackMechanism: 'Kullanıcı kamerayla okuttuğunda meşru ödeme sayfası yerine sahte kredi kartı tahsilat ekranı açılır ve kart bilgileri ile SMS OTP kodu çalınır.',
    realWorldScenario: 'Sürücü otopark ücretini ödemek için otomattaki QR kodu okutur. Açılan "otopark-belediye-odeme.click" sitesine kart bilgilerini girer.',
    defenseAction: 'QR kodun fiziksel olarak bir çıkartma (sticker) ile kapatılıp kapatılmadığını elle dokunarak kontrol edin. Şüpheli durumlarda resmi mobil uygulamayı kullanın.',
  },
  {
    id: 'quishing-email-bypass',
    title: 'E-Posta Ağ Geçidi Atlama (Secure Gateway Evasion)',
    category: 'Kurumsal Kimlik Avı',
    mitre: 'T1566.002 - Spearphishing Link',
    summary: 'Kurumsal e-posta filtreleri metin içindeki linkleri tarayabilir ancak e-posta içine gömülü resim/PDF formatındaki QR kodların içeriğini genellikle denetleyemez.',
    attackMechanism: 'Saldırgan çalışanlara "MFA Cihazınızı Yeniden Tanımlayın" veya "Maaş Bordrosu Görüntüleme" konulu bir QR kodu görsel olarak gönderir. Kullanıcı telefonuyla tarayınca kurumsal e-posta koruması devre dışı kalır.',
    realWorldScenario: 'Şirket çalışanına İK departmanı adına "Yıllık İzin Girişi için QR Kodu Telefonunuzla Taratın" mesajı iletilir.',
    defenseAction: 'Kurumsal e-posta ağ geçitlerinde OCR (Optik Karakter Tanıma) destekli QR denetimi uygulayın ve çalışanları masaüstü işlemlerinde telefonla QR taramama konusunda eğitin.',
  },
  {
    id: 'quishing-restaurant',
    title: 'Restoran Masası & Menü Sahteciliği',
    category: 'Fiziksel Quishing',
    mitre: 'T1566.002 - Spearphishing Link',
    summary: 'Restoran ve kafelerdeki masalarda yer alan dijital menü veya Wi-Fi QR kodlarının gizlice değiştirilmesi.',
    attackMechanism: 'Masadaki QR kod değiştirilerek zararlı APK/uygulama indirme sayfasına veya sahte anket/ödül formuna yönlendirme yapılır.',
    realWorldScenario: 'Müşteri menüye bakmak için QR kodu okutur, "Menüyü görüntülemek için güncelleme gereklidir" uyarısıyla zararlı profil yükletilir.',
    defenseAction: 'Menü için tarayıcıda doğrudan dosya indirme veya profil yükleme uyarısı çıktığında derhal iptal edin ve restoran görevlisine bildirin.',
  },
  {
    id: 'punycode-homograph',
    title: 'Punycode & IDN Homograf Karakter Saldırıları',
    category: 'Alan Adı Manipülasyonu',
    mitre: 'T1583.001 - Domains',
    summary: 'Görünüşte resmi kuruma ait gibi duran ancak farklı alfabelerden (Kiril, Yunan) benzer harfler içeren alan adları oluşturulması.',
    attackMechanism: 'Örneğin Latin alfabesindeki "a" harfi yerine Kiril "а" (U+0430) harfi kullanılır. Tarayıcı bunu "xn--" punycode adresi olarak çözer ancak gözle ayırt etmek imkansızdır.',
    realWorldScenario: 'Kullanıcı adres çubuğunda "garanti.com.tr" gördüğünü zanneder ancak alan adı aslında "xn--granti-1ua..." adresidir.',
    defenseAction: 'BAZ gibi homograf dedektörleri kullanın. Kritik bankacılık ve kamu işlemlerinde linke tıklamak yerine yer imlerini veya arama motorunu kullanın.',
  },
  {
    id: 'mfa-session-hijack',
    title: 'Cihaz Eşleştirme & Oturum Ele Geçirme (Device Pairing)',
    category: 'Kimlik Hırsızlığı',
    mitre: 'T1539 - Steal Web Session Cookie',
    summary: 'WhatsApp Web, Discord, Telegram veya bankacılık uygulamalarındaki "QR ile Cihaz Eşle" özelliğinin istismar edilmesi.',
    attackMechanism: 'Saldırgan kendi oturumunun QR kodunu kurbana göstererek "Ödülü kazanmak için bu kodu uygulamanızdan okutun" der. Kurban okuttuğu anda saldırganın tarayıcısına kendi hesabı giriş yapar.',
    realWorldScenario: 'Discord veya Steam üzerinde "Ücretsiz Nitro" vaadiyle sunulan QR kod, aslında saldırganın oturum açma istek matrisidir.',
    defenseAction: 'Sosyal medya veya mesajlaşma uygulamalarının "Bağlı Cihazlar" menüsündeki QR okuyucusunu ASLA üçüncü taraf sitelerde veya hediyeler için okutmayın.',
  },
];

export const ThreatEncyclopedia: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(THREAT_VECTORS[0].id);

  const activeVector = THREAT_VECTORS.find((v) => v.id === selectedId) || THREAT_VECTORS[0];

  return (
    <div className="space-y-6">
      {/* Overview Intro */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-semibold text-white tracking-tight">
            Quishing (QR Phishing) & Siber Tehdit Bilgi Bankası
          </h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          Quishing (QR Kod Oltalama), siber saldırganların geleneksel e-posta güvenlik ağ geçitlerini (SEG) ve web filtrelerini atlatmak amacıyla kötü amaçlı bağlantıları QR kod görüntülerine dönüştürdüğü hızla yükselen bir siber saldırı vektörüdür.
        </p>
      </div>

      {/* Interactive Threat Catalog Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of Vectors */}
        <div className="lg:col-span-5 space-y-2">
          {THREAT_VECTORS.map((vector) => {
            const isSelected = vector.id === selectedId;
            return (
              <button
                key={vector.id}
                type="button"
                onClick={() => setSelectedId(vector.id)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 shadow-sm'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-white">{vector.title}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? 'text-emerald-400 translate-x-1' : 'text-slate-600'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{vector.category}</span>
                  <span>·</span>
                  <span className="font-mono text-emerald-400/90">{vector.mitre}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
              <span>MITRE ATT&CK TEKNİĞİ: {activeVector.mitre}</span>
              <span>·</span>
              <span>{activeVector.category}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{activeVector.title}</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {activeVector.summary}
            </p>
          </div>

          <div className="space-y-4">
            {/* Attack Mechanism */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Saldırı Mekanizması & İstismar Yöntemi</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeVector.attackMechanism}
              </p>
            </div>

            {/* Real World Scenario */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Eye className="w-3.5 h-3.5" />
                <span>Gerçek Dünya Örnek Senaryosu</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeVector.realWorldScenario}
              </p>
            </div>

            {/* Defense Action */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Önerilen Savunma & Önlem Protokolü</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeVector.defenseAction}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
