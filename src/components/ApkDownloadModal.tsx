import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import {
  X,
  Download,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Check,
  Copy,
  Terminal,
  Code2,
  FolderArchive,
  ArrowRight,
} from 'lucide-react';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkDownloadModal: React.FC<ApkDownloadModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isIOS } = usePWAInstall();
  const [copied, setCopied] = useState<boolean>(false);
  const [showGradleSnippet, setShowGradleSnippet] = useState<boolean>(false);

  if (!isOpen) return null;

  // The live public web URL of the application
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-vdv7ziyyog62z55fwdb2hl-85079460739.europe-west2.run.app';
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Android Studio & APK İndirme Merkezi</h3>
              <p className="text-[11px] text-slate-400">BAZ Güvenlik uygulamasını Android Studio projesi veya APK olarak indirin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Section 1: Android Studio Project Export (Exact match with user's Gradle structure) */}
          <div className="p-4 bg-slate-950 border border-emerald-500/50 rounded-xl space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <FolderArchive className="w-4 h-4" />
                <span>1. Android Studio Projesini İndir (.ZIP)</span>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-semibold font-mono">
                Gradle 8.8+ Hazır
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              Android Studio için <code className="text-emerald-400 font-bold font-mono">build.gradle.kts</code> ve <code className="text-emerald-400 font-bold font-mono">libs.versions.toml</code> yapılandırmanızla birebir uyumlu, kamera yetkileri tanımlanmış tam proje dosyası hazırlandı. Zipten çıkarıp Android Studio ile açarak doğrudan derleyebilirsiniz.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="/baz-android-studio-project.zip"
                download="baz-android-studio-project.zip"
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Android Studio Projesini İndir (.ZIP)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowGradleSnippet(!showGradleSnippet)}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showGradleSnippet ? 'Kapat' : 'Gradle Gör'}</span>
              </button>
            </div>

            {showGradleSnippet && (
              <div className="mt-2 space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">app/build.gradle.kts:</div>
                <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-emerald-300 overflow-x-auto select-all leading-relaxed">
{`plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "com.baz.security"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.baz.security"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions { jvmTarget = "11" }
}

dependencies {
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.core.ktx)
    implementation(libs.material)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}`}
                </pre>
              </div>
            )}
          </div>

          {/* Section 2: Direct Phone Install (PWA / Standalone WebApp) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>2. Doğrudan Telefona Yükle (PWA)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">0 İndirme Gerektirir</span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              Android telefonunuzda Google Chrome veya Samsung Internet ile uygulamayı açtığınızda tek tıkla bağımsız bir uygulama olarak ana ekrana yükleyebilirsiniz.
            </p>

            {isInstalled ? (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-lg text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">BAZ uygulaması cihazınızda zaten yüklü!</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                onClick={async () => {
                  const success = await install();
                  if (success) onClose();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>BAZ Uygulamasını Şimdi Telefona Kur</span>
              </button>
            ) : isIOS ? (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-slate-400 text-[11px]">
                <div className="text-white font-semibold">iPhone / iPad Kurulumu:</div>
                <div>1. Safari alt çubuğundaki <span className="text-emerald-400 font-bold">Paylaş</span> butonuna dokunun.</div>
                <div>2. <span className="text-emerald-400 font-bold">Ana Ekrana Ekle</span> seçeneğini seçin.</div>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-slate-400 text-[11px]">
                <div>Tarayıcınızın sağ üstündeki <span className="text-white font-bold">üç nokta (⋮)</span> menüsünden <span className="text-emerald-400 font-bold">"Uygulamayı Yükle"</span> butonuna basarak telefona kurabilirsiniz.</div>
              </div>
            )}
          </div>

          {/* Section 3: 1-Click Online APK Generation via PWABuilder (Google / Microsoft Official) */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>3. Online İmzalı .APK İndir (PWABuilder)</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Google TWA</span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              Google ve Microsoft'un resmi bulut derleyicisi üzerinden tek tıkla doğrudan imzalanmış <code className="text-emerald-400 font-bold">.apk</code> dosyanızı üretebilirsiniz:
            </p>

            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              <span>PWABuilder ile Doğrudan APK Üret</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
