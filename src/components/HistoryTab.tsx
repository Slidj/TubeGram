import React, { useState, useEffect } from 'react';
import { History, Trash2, Clock, Play, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { VideoItem, UserAccountState } from '../types';
import { VideoCard } from './VideoCard';
import { fetchServerHistory } from '../services/innerTubeClient';
import { triggerHaptic } from '../services/telegram';

interface HistoryTabProps {
  history: VideoItem[];
  accountState: UserAccountState;
  onSelectVideo: (video: VideoItem) => void;
  onClearHistory: () => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  accountState,
  onSelectVideo,
  onClearHistory
}) => {
  const [syncedHistory, setSyncedHistory] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (accountState.isGoogleConnected) {
      loadHistory();
    }
  }, [accountState.isGoogleConnected]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const videos = await fetchServerHistory();
      if (videos.length > 0) {
        setSyncedHistory(videos);
      }
    } catch (e) {
      console.warn('History fetch notice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const displayVideos = accountState.isGoogleConnected && syncedHistory.length > 0
    ? syncedHistory
    : history;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Історія перегляду</span>
            {accountState.isGoogleConnected && (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 rounded px-1.5 py-0.5">
                Синхронізовано з YouTube
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400">
            {accountState.isGoogleConnected
              ? 'Відео, які ви дивилися на YouTube та в додатку'
              : 'Локальна історія відео без реклами'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {accountState.isGoogleConnected && (
            <button
              onClick={() => {
                triggerHaptic('light');
                loadHistory();
              }}
              disabled={isLoading}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors active:scale-95"
              title="Оновити історію з YouTube"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {displayVideos.length > 0 && !accountState.isGoogleConnected && (
            <button
              onClick={() => {
                triggerHaptic('warning');
                if (confirm('Очистити всю локальну історію переглядів?')) {
                  onClearHistory();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 rounded-xl transition-colors active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистити</span>
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 mx-auto mb-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p>Отримання історії з вашого акаунта YouTube...</p>
        </div>
      ) : displayVideos.length === 0 ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <History className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">Історія порожня</p>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Оберіть відео на головній або у підписках, щоб почати перегляд без реклами.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayVideos.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
          ))}
        </div>
      )}
    </div>
  );
};
