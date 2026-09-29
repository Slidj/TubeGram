import React from 'react';
import { ShieldCheck, Sparkles, Terminal, User } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { UserAccountState } from '../types';

interface TopBarProps {
  onOpenSearch: () => void;
  onOpenGuide: () => void;
  onOpenProfile: () => void;
  accountState: UserAccountState;
  savedSeconds: number;
}

export const TopBar: React.FC<TopBarProps> = ({ 
  onOpenSearch, 
  onOpenGuide, 
  onOpenProfile, 
  accountState 
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-950/50">
          <svg className="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            TubeGram
            <span className="inline-flex items-center text-[10px] font-semibold tracking-wide text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded px-1.5 py-0.2">
              ZERO-ADS
            </span>
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation / Status info */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>YouTube Ads: 0%</span>
        </div>
        <span aria-hidden="true" className="text-slate-700">·</span>
        <div className="flex items-center gap-1 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>SponsorBlock</span>
        </div>
      </div>

      {/* Zone 3: Actions & Account Switcher */}
      <div className="flex items-center gap-2">
        {/* Account Button */}
        <button
          onClick={() => {
            triggerHaptic('selection');
            onOpenProfile();
          }}
          className="min-h-[38px] px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
          title="Керування акаунтом (Telegram / YouTube)"
        >
          {accountState.isGoogleConnected && accountState.googleUser?.photoURL ? (
            <img 
              src={accountState.googleUser.photoURL} 
              alt="Google" 
              className="w-4 h-4 rounded-full" 
            />
          ) : (
            <User className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className="max-w-[70px] truncate text-[11px]">
            {accountState.isGoogleConnected 
              ? accountState.googleUser?.name?.split(' ')[0] 
              : 'Профіль'}
          </span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenGuide();
          }}
          className="min-h-[38px] px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors hidden xs:flex items-center gap-1.5 active:scale-95"
          title="Як підключити до Telegram бота"
        >
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">TG Бот</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            onOpenSearch();
          }}
          className="min-h-[38px] px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors shadow-sm flex items-center gap-1 active:scale-95 whitespace-nowrap"
        >
          <span>Вставити URL</span>
        </button>
      </div>
    </header>
  );
};
