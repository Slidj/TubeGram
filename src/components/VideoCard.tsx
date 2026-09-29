import React from 'react';
import { VideoItem } from '../types';
import { formatViews } from '../services/youtubeApi';
import { ShieldCheck, Play } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface VideoCardProps {
  video: VideoItem;
  onSelect: (video: VideoItem) => void;
  isActive?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, isActive }) => {
  const handleClick = () => {
    triggerHaptic('selection');
    onSelect(video);
  };

  return (
    <article
      onClick={handleClick}
      className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.98] ${
        isActive
          ? 'bg-slate-900/90 ring-1 ring-red-500/50'
          : 'bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800/40 hover:border-slate-750'
      }`}
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          onError={(e) => {
            // High reliability fallback if thumbnail fails
            const target = e.currentTarget;
            target.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
          }}
        />

        {/* Video overlay scrim for bottom text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white bg-black/80 rounded backdrop-blur-sm">
          {video.durationFormatted}
        </span>

        {/* Zero-Ad badge */}
        <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300 bg-black/75 rounded backdrop-blur-sm">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>No Ads</span>
        </span>

        {/* Hover play icon indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Content - Clean Unboxed Metadata */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 text-balance group-hover:text-red-400 transition-colors">
          {video.title}
        </h3>

        {/* Metadata row with unboxed text and dot separators */}
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 truncate">
          <span className="font-medium text-slate-300 truncate max-w-[130px]">
            {video.channelTitle}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="tabular-nums">{formatViews(video.views)} переглядів</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>{video.publishedTime}</span>
        </div>

        {/* SponsorBlock indicators if known */}
        {video.sponsorCount !== undefined && video.sponsorCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>SponsorBlock: {video.sponsorCount} сегмент{video.sponsorCount > 1 ? 'и' : ''} буде пропущено</span>
          </div>
        )}
      </div>
    </article>
  );
};
