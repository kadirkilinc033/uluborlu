import React from 'react';
import { Camera, Search, Layers, QrCode, BookOpen } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'qr-camera' | 'scanner' | 'batch' | 'generator' | 'threat-intel';
  setActiveTab: (tab: 'qr-camera' | 'scanner' | 'batch' | 'generator' | 'threat-intel') => void;
  onResetReport: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onResetReport,
}) => {
  const tabs = [
    { id: 'qr-camera' as const, label: 'QR Tara', icon: Camera },
    { id: 'scanner' as const, label: 'Link Analiz', icon: Search },
    { id: 'batch' as const, label: 'Toplu', icon: Layers },
    { id: 'generator' as const, label: 'QR Üret', icon: QrCode },
    { id: 'threat-intel' as const, label: 'Tehditler', icon: BookOpen },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                onResetReport();
                setActiveTab(tab.id);
              }}
              className={`flex flex-col items-center justify-center min-h-[48px] w-full transition-colors cursor-pointer ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-emerald-950/60 text-emerald-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap ${
                  isActive ? 'font-bold text-white' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
