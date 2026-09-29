import React, { useState, useEffect } from 'react';
import { VideoItem } from '../types';
import { CATEGORIES } from '../services/youtubeApi';
import { SubscribedChannel } from '../services/googleAuth';
import { fetchServerHomeFeed } from '../services/innerTubeClient';
import { VideoCard } from './VideoCard';
import { Shield, Sparkles, Zap, Flame, Users, ChevronRight, Plus } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface HomeFeedProps {
  videos: VideoItem[];
  currentVideo: VideoItem | null;
  onSelectVideo: (video: VideoItem) => void;
  onOpenSearch: () => void;
  onOpenSubscriptions: () => void;
  subscribedChannels?: SubscribedChannel[];
  isTrending?: boolean;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  videos,
  currentVideo,
  onSelectVideo,
  onOpenSearch,
  onOpenSubscriptions,
  subscribedChannels = [],
  isTrending = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    subscribedChannels.length > 0 ? 'Мої підписки' : 'Усі'
  );

  const categories = subscribedChannels.length > 0 
    ? ['Мої підписки', 'Усі', 'Технології', 'Музика', 'SmartTube гайди', 'Новини']
    : CATEGORIES;

  const [serverVideos, setServerVideos] = useState<VideoItem[]>([]);
  const [isPersonalized, setIsPersonalized] = useState<boolean>(false);

  useEffect(() => {
    fetchServerHomeFeed().then((res) => {
      if (res.videos && res.videos.length > 0) {
        setServerVideos(res.videos);
        setIsPersonalized(res.isPersonalized);
      }
    });
  }, []);

  const displayBaseVideos = serverVideos.length > 0 ? serverVideos : videos;

  // Generate videos for user's subscribed channels if selected
  const subscribedVideos: VideoItem[] = subscribedChannels.flatMap((ch) => [
    {
      id: `sub-${ch.id}-1`,
      title: `${ch.title}: Новий випуск та розбір (Без реклами)`,
      channelTitle: ch.title,
      views: '124K',
      publishedTime: 'Сьогодні',
      duration: 540,
      durationFormatted: '9:00',
      description: `Свіже відео каналу ${ch.title} готове до перегляду без комерційних роликів YouTube.`,
      thumbnail: ch.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=720&auto=format&fit=crop&q=80',
      sponsorCount: 1
    }
  ]);

  const activeVideos = selectedCategory === 'Мої підписки' && subscribedVideos.length > 0
    ? [...subscribedVideos, ...displayBaseVideos]
    : displayBaseVideos.filter((v) => {
        if (selectedCategory === 'Усі' || selectedCategory === 'Мої підписки') return true;
        if (selectedCategory === 'Технології') {
          return v.title.toLowerCase().includes('it') || v.title.toLowerCase().includes('demo') || v.title.toLowerCase().includes('hardware');
        }
        if (selectedCategory === 'Музика') {
          return v.title.toLowerCase().includes('rick') || v.title.toLowerCase().includes('gangnam') || v.title.toLowerCase().includes('queen') || v.title.toLowerCase().includes('despacito');
        }
        if (selectedCategory === 'SmartTube гайди') {
          return v.title.toLowerCase().includes('smarttube') || v.description.toLowerCase().includes('sponsorblock');
        }
        return true;
      });

  return (
    <div className="space-y-4">
      {/* Subscribed Channels Avatar Carousel (SmartTube style) */}
      {!isTrending && subscribedChannels.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-red-500" />
              <span>Ваші канали ({subscribedChannels.length})</span>
            </span>
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSubscriptions();
              }}
              className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-0.5"
            >
              <span>Керувати</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
            {subscribedChannels.map((ch) => (
              <div
                key={ch.id}
                onClick={() => {
                  triggerHaptic('selection');
                  onOpenSubscriptions();
                }}
                className="flex flex-col items-center gap-1 cursor-pointer shrink-0 group"
              >
                <div className="w-13 h-13 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-red-600 ring-2 ring-slate-900 group-hover:scale-105 transition-transform">
                  {ch.thumbnail ? (
                    <img
                      src={ch.thumbnail}
                      alt={ch.title}
                      className="w-full h-full rounded-full object-cover bg-slate-950"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-red-400">
                      {ch.title.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-300 font-medium max-w-[65px] truncate text-center">
                  {ch.title}
                </span>
              </div>
            ))}

            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSubscriptions();
              }}
              className="flex flex-col items-center gap-1 cursor-pointer shrink-0"
            >
              <div className="w-13 h-13 rounded-full border-2 border-dashed border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-slate-400">Додати</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Ad-Free Feature Showcase (Only if no video actively playing on top and 0 subscriptions) */}
      {!isTrending && !currentVideo && subscribedChannels.length === 0 && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-red-950/30 border border-slate-800 p-5 shadow-xl">
          <div className="relative z-10 max-w-lg space-y-2.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold">
              <Zap className="w-3 h-3 fill-current" />
              <span>Повний нуль реклами</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight text-balance leading-snug">
              YouTube без комерційних пауз та зі SmartTube SponsorBlock
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Дивіться будь-які ролики напряму. Офіційні рекламні блоки YouTube відсутні у прямому потоці, а спонсорські перебивки всередині відео вирізаються автоматично!
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  if (videos[0]) onSelectVideo(videos[0]);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-red-950/50"
              >
                Тестовий запуск без реклами
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  onOpenSubscriptions();
                }}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700/60 active:scale-95 transition-all"
              >
                Синхронізувати канали
              </button>
            </div>
          </div>

          <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
        </div>
      )}

      {/* Category Filter Tabs */}
      {!isTrending && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedCategory(cat);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 shrink-0 ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Section Title */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
          {isTrending ? (
            <>
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Трендові відео сьогодні</span>
            </>
          ) : selectedCategory === 'Мої підписки' && subscribedChannels.length > 0 ? (
            <>
              <Users className="w-4 h-4 text-red-500" />
              <span>Відео ваших каналів ({activeVideos.length})</span>
            </>
          ) : (
            <span>Рекомендовані відео ({activeVideos.length})</span>
          )}
        </h2>

        <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
          <Shield className="w-3 h-3" />
          Без реклами
        </span>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {activeVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            isActive={currentVideo?.id === video.id}
            onSelect={onSelectVideo}
          />
        ))}
      </div>
    </div>
  );
};
