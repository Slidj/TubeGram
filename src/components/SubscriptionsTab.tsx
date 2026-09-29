import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, Sparkles, RefreshCw, LogOut, CheckCircle2, 
  Tv, Play, ShieldCheck, ChevronRight, ArrowLeft,
  Plus, Upload, ExternalLink, AlertTriangle, Trash2, Copy, Check
} from 'lucide-react';
import { VideoItem, UserAccountState } from '../types';
import { 
  getDeviceAuth, 
  getAuthStatus, 
  logoutDevice, 
  fetchServerSubscriptions 
} from '../services/innerTubeClient';
import { VideoCard } from './VideoCard';
import { triggerHaptic } from '../services/telegram';

interface SubscriptionsTabProps {
  accountState: UserAccountState;
  onUpdateAccount: (account: UserAccountState) => void;
  onSelectVideo: (video: VideoItem) => void;
}

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({
  accountState,
  onUpdateAccount,
  onSelectVideo
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deviceAuth, setDeviceAuth] = useState<{
    loggedIn: boolean;
    pending?: boolean;
    user_code?: string;
    verification_url?: string;
    user?: { name: string; avatar?: string };
  }>({ loggedIn: false });
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Subscriptions & Channel videos
  const [channels, setChannels] = useState<any[]>([]);
  const [subVideos, setSubVideos] = useState<VideoItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any | null>(null);

  // Fetch initial auth status
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const status = await getAuthStatus();
    setDeviceAuth(status);
    if (status.loggedIn) {
      onUpdateAccount({
        isGoogleConnected: true,
        activeProfile: 'google',
        googleUser: {
          name: status.user?.name || 'Мій YouTube Акаунт',
          email: 'YouTube Синхронізація (SmartTube)',
          photoURL: status.user?.avatar
        }
      });
      loadServerSubs();
    }
  };

  // Poll for code authorization while pending
  useEffect(() => {
    if (!deviceAuth.pending || deviceAuth.loggedIn) return;

    const interval = setInterval(async () => {
      const status = await getAuthStatus();
      if (status.loggedIn) {
        triggerHaptic('success');
        setDeviceAuth(status);
        onUpdateAccount({
          isGoogleConnected: true,
          activeProfile: 'google',
          googleUser: {
            name: status.user?.name || 'Мій YouTube Акаунт',
            email: 'YouTube Синхронізація (SmartTube)',
            photoURL: status.user?.avatar
          }
        });
        loadServerSubs();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [deviceAuth.pending, deviceAuth.loggedIn]);

  const handleStartSmartTubeLogin = async () => {
    triggerHaptic('medium');
    setIsLoading(true);
    try {
      const res = await getDeviceAuth();
      setDeviceAuth(res);
      if (res.loggedIn) {
        loadServerSubs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    triggerHaptic('warning');
    await logoutDevice();
    setDeviceAuth({ loggedIn: false });
    setChannels([]);
    setSubVideos([]);
    setSelectedChannel(null);
    onUpdateAccount({
      ...accountState,
      isGoogleConnected: false,
      activeProfile: 'telegram',
      googleUser: undefined
    });
  };

  const loadServerSubs = async () => {
    setIsLoading(true);
    try {
      const res = await fetchServerSubscriptions();
      setChannels(res.channels || []);
      setSubVideos(res.videos || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!deviceAuth.user_code) return;
    triggerHaptic('success');
    navigator.clipboard.writeText(deviceAuth.user_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // If viewing single channel
  if (selectedChannel) {
    const channelVideos = subVideos.filter(v => v.channelTitle === selectedChannel.title);
    return (
      <div className="space-y-4 animate-in fade-in duration-150">
        <button
          onClick={() => {
            triggerHaptic('light');
            setSelectedChannel(null);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Назад до всіх підписок</span>
        </button>

        <div className="flex items-center gap-3 p-4 bg-slate-900/70 border border-slate-800 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center font-bold text-base">
            {selectedChannel.title.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{selectedChannel.title}</h2>
            <p className="text-xs text-slate-400">Підписка з вашого реального акаунта YouTube</p>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Свіжі відео з каналу ({channelVideos.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {channelVideos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Account Info Header */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-3xl flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {deviceAuth.loggedIn && deviceAuth.user?.avatar ? (
            <img
              src={deviceAuth.user.avatar}
              alt="Avatar"
              className="w-11 h-11 rounded-full border border-slate-700 shrink-0"
            />
          ) : (
            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
              deviceAuth.loggedIn ? 'bg-red-600 text-white' : 'bg-sky-500/20 text-sky-400'
            }`}>
              {deviceAuth.loggedIn ? 'YT' : 'TG'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white truncate">
                {deviceAuth.loggedIn 
                  ? (deviceAuth.user?.name || 'Ваш YouTube Акаунт')
                  : 'Профіль Telegram'}
              </h3>
              {deviceAuth.loggedIn && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-400 truncate">
              {deviceAuth.loggedIn 
                ? 'Повна синхронізація (SmartTube InnerTube)'
                : 'Локальний режим перегляду'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deviceAuth.loggedIn ? (
            <>
              <button
                onClick={loadServerSubs}
                disabled={isLoading}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors active:scale-95"
                title="Оновити з YouTube"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Вийти</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStartSmartTubeLogin}
              disabled={isLoading}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Увійти через код</span>
            </button>
          )}
        </div>
      </div>

      {/* SmartTube Device Code Login Card */}
      {!deviceAuth.loggedIn && (
        <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-red-950/40 border border-slate-800 rounded-3xl space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Вхід як у SmartTube (Device Code)</h3>
              <p className="text-xs text-slate-400">
                Справжня синхронізація: ваші підписки, рекомендації та запис переглянутого в офіційну історію!
              </p>
            </div>
          </div>

          {deviceAuth.pending && deviceAuth.user_code ? (
            <div className="p-4 bg-slate-950/80 border border-red-500/50 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Крок 1: Відкрийте посилання</span>
                <a
                  href={deviceAuth.verification_url || 'https://www.google.com/device'}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 active:scale-95"
                >
                  <span>google.com/device</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Крок 2: Введіть цей код</span>
                  <span className="text-xl font-black font-mono tracking-widest text-emerald-400">
                    {deviceAuth.user_code}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium active:scale-95 transition-all"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Скопійовано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Копіювати код</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span>Очікуємо підтвердження на телефоні або в браузері...</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartSmartTubeLogin}
              disabled={isLoading}
              className="w-full h-11 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Tv className="w-4 h-4" />
                  <span>Отримати код для входу (google.com/device)</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Subscriptions Videos Feed */}
      {deviceAuth.loggedIn && (
        <div className="space-y-4">
          {/* Channels Carousel */}
          {channels.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-red-500" />
                <span>Ваші підписані канали ({channels.length})</span>
              </h4>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedChannel(ch);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-medium text-slate-200 whitespace-nowrap active:scale-95 transition-all shrink-0"
                  >
                    {ch.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Videos Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Свіжі відео з ваших підписок ({subVideos.length})</span>
              </h4>
              <span className="text-[11px] text-emerald-400 font-mono">Синхронізація активна</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p>Завантаження стрічки підписок...</p>
              </div>
            ) : subVideos.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-xs text-slate-400">
                Не знайдено нових випусків. Натисніть кнопку оновлення у верхньому кутку.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subVideos.map((video) => (
                  <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
