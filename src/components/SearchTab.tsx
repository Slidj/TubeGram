import React, { useState } from 'react';
import { Search, Link as LinkIcon, ArrowRight, Sparkles, X } from 'lucide-react';
import { VideoItem } from '../types';
import { extractYouTubeId, searchVideos } from '../services/youtubeApi';
import { VideoCard } from './VideoCard';
import { triggerHaptic } from '../services/telegram';

interface SearchTabProps {
  onSelectVideo: (video: VideoItem) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({ onSelectVideo }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VideoItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (overrideQ?: string) => {
    const q = (overrideQ !== undefined ? overrideQ : query).trim();
    if (!q) return;

    triggerHaptic('light');
    setIsSearching(true);
    setHasSearched(true);

    try {
      const data = await searchVideos(q);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDirectUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const extractedId = extractYouTubeId(query);
    if (extractedId) {
      triggerHaptic('success');
      const directVideo: VideoItem = {
        id: extractedId,
        title: `Відео [Потік: ${extractedId}]`,
        channelTitle: 'Нативний чистий потік (Direct Stream)',
        views: 'Прямий потік',
        publishedTime: 'Щойно',
        duration: 300,
        durationFormatted: 'Стрім',
        description: 'Відтворюється нативним плеєром без iframes, без посилань на YouTube та з автопропуском через SponsorBlock.',
        thumbnail: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=720&auto=format&fit=crop&q=80`
      };
      onSelectVideo(directVideo);
    } else {
      handleSearch();
    }
  };

  const quickQueries = [
    'SmartTube огляд',
    'Tech огляди',
    'Rick Astley 4K',
    'Українські подкасти',
    'Google Developers'
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">Пошук та вставка URL</h2>
        <p className="text-xs text-slate-400">
          Вставте посилання на будь-яке відео з YouTube або введіть запит для перегляду без реклами
        </p>
      </div>

      {/* Input Box */}
      <form onSubmit={handleDirectUrlSubmit} className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            {query.includes('youtu') ? (
              <LinkIcon className="w-4 h-4 text-sky-400" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Вставте youtube.com/watch?v=... або запит"
            className="w-full h-12 pl-10 pr-24 bg-slate-900 border border-slate-750 focus:border-red-500 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-14 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            className="absolute right-1.5 h-9 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-md"
          >
            <span>Знайти</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Quick query chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] text-slate-500 shrink-0 font-medium">Часто шукають:</span>
        {quickQueries.map((item) => (
          <button
            key={item}
            onClick={() => {
              setQuery(item);
              handleSearch(item);
            }}
            className="px-2.5 py-1 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg whitespace-nowrap active:scale-95 transition-all shrink-0"
          >
            {item}
          </button>
        ))}
      </div>

      {/* Results */}
      {isSearching ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <div className="w-8 h-8 mx-auto mb-2 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p>Пошук відео без реклами...</p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">
          Нічого не знайдено. Спробуйте вставити пряме посилання на відео з YouTube.
        </div>
      ) : (
        results.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Результати пошуку ({results.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((v) => (
                <VideoCard key={v.id} video={v} onSelect={onSelectVideo} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};
