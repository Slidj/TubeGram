import React from 'react';
import { 
  ShieldCheck, Sparkles, Smartphone, Terminal, 
  RotateCcw, Github, Check, Copy, ExternalLink, Zap, Users, User, Tv
} from 'lucide-react';
import { SponsorBlockSettings, UserAccountState } from '../types';
import { triggerHaptic } from '../services/telegram';

interface SettingsTabProps {
  settings: SponsorBlockSettings;
  onUpdateSettings: (settings: SponsorBlockSettings) => void;
  onOpenDeployGuide: () => void;
  accountState: UserAccountState;
  onOpenSubscriptions: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onOpenDeployGuide,
  accountState,
  onOpenSubscriptions
}) => {
  const toggleSetting = (key: keyof SponsorBlockSettings) => {
    triggerHaptic('selection');
    const updated = {
      ...settings,
      [key]: !settings[key]
    };
    onUpdateSettings(updated);
  };

  const resetStats = () => {
    triggerHaptic('warning');
    if (confirm('Скинути статистику заощадженого часу?')) {
      onUpdateSettings({
        ...settings,
        savedSecondsTotal: 0,
        skippedSegmentsCount: 0
      });
    }
  };

  const minutesSaved = Math.floor(settings.savedSecondsTotal / 60);
  const secondsRem = settings.savedSecondsTotal % 60;

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Налаштування та Статистика</h2>
        <p className="text-xs text-slate-400">
          Керування блокуванням офіційної та спонсорської реклами
        </p>
      </div>

      {/* Account Profile Status Card */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-sky-400" />
            <span>Акаунт та Синхронізація</span>
          </h3>

          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            accountState.isGoogleConnected 
              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60' 
              : 'bg-slate-800 text-slate-300'
          }`}>
            {accountState.isGoogleConnected ? 'YouTube синхронізовано' : 'Telegram режим'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-850 rounded-2xl">
          <div className="flex items-center gap-3">
            {accountState.isGoogleConnected && accountState.googleUser?.photoURL ? (
              <img
                src={accountState.googleUser.photoURL}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                TG
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-white">
                {accountState.isGoogleConnected 
                  ? accountState.googleUser?.name 
                  : 'Користувач Telegram'}
              </p>
              <p className="text-[11px] text-slate-400">
                {accountState.isGoogleConnected 
                  ? accountState.googleUser?.email 
                  : 'Локальна історія без реклами'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onOpenSubscriptions();
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-sm"
          >
            {accountState.isGoogleConnected ? 'Мої підписки' : 'Підключити YouTube'}
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Заощаджено часу</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {minutesSaved}<span className="text-sm font-sans text-slate-400">хв</span> {secondsRem}<span className="text-sm font-sans text-slate-400">с</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">без перебивок на рекламу</p>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Пропущено сегментів</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {settings.skippedSegmentsCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">через SponsorBlock</p>
        </div>
      </div>

      {/* Ad Blocking Status Summary */}
      <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl">
        <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs mb-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Подвійний захист від реклами активний</span>
        </div>
        <ul className="text-xs text-slate-300 space-y-1">
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span><strong>Офіційна реклама YouTube:</strong> 100% заблоковано (захищений рушій без скриптів AdSense).</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span><strong>Вбудована реклама авторів:</strong> автоматичний пропуск за базою SponsorBlock.</span>
          </li>
        </ul>
      </div>

      {/* SponsorBlock Options */}
      <div className="space-y-3 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Категорії SponsorBlock (SmartTube)
        </h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Спонсорські інтеграції</p>
              <p className="text-xs text-slate-400">Пряма реклама товарів, сервісів та брендів</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSkipSponsor}
              onChange={() => toggleSetting('autoSkipSponsor')}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </label>

          <div className="h-px bg-slate-800" />

          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Самореклама автора</p>
              <p className="text-xs text-slate-400">Мерч, платна підписка Patreon, інші канали автора</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSkipSelfPromo}
              onChange={() => toggleSetting('autoSkipSelfPromo')}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </label>

          <div className="h-px bg-slate-800" />

          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Нагадування про підписку</p>
              <p className="text-xs text-slate-400">"Поставте лайк, натисніть дзвіночок"</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSkipInteraction}
              onChange={() => toggleSetting('autoSkipInteraction')}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </label>

          <div className="h-px bg-slate-800" />

          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Інтро та фінальні титри</p>
              <p className="text-xs text-slate-400">Довгі вступи та картки в кінці відео</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoSkipIntroOutro}
              onChange={() => toggleSetting('autoSkipIntroOutro')}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Telegram & System Options */}
      <div className="space-y-3 bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Telegram Mini App та Інтерфейс
        </h3>

        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Тактильна віддача (Haptic Feedback)</p>
              <p className="text-xs text-slate-400">Вібрація Telegram при пропуску реклами</p>
            </div>
            <input
              type="checkbox"
              checked={settings.hapticFeedback}
              onChange={() => toggleSetting('hapticFeedback')}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </label>

          <div className="h-px bg-slate-800" />

          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-2">
              <p className="text-sm font-medium text-white">Спливаюче сповіщення при пропуску</p>
              <p className="text-xs text-slate-400">Показувати скільки секунд заощаджено</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showSkipToast}
              onChange={() => toggleSetting('showSkipToast')}
              className="w-5 h-5 rounded accent-red-600 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* GitHub & BotFather Launch Button */}
      <button
        onClick={onOpenDeployGuide}
        className="w-full p-4 bg-gradient-to-r from-sky-950 to-indigo-950 border border-sky-800/60 rounded-2xl text-left flex items-center justify-between group active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
              Інструкція: GitHub + Telegram Mini App
            </h4>
            <p className="text-xs text-slate-400">
              Як залити на GitHub Pages та підключити бота через @BotFather
            </p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white" />
      </button>

      {/* Reset Stats */}
      <div className="pt-2 text-center">
        <button
          onClick={resetStats}
          className="text-xs text-slate-500 hover:text-slate-400 underline"
        >
          Скинути лічильник заощадженого часу
        </button>
      </div>
    </div>
  );
};
