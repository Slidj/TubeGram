import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  RotateCcw, Sparkles, Shield, Share2, 
  Settings2, FastForward, CheckCircle2, ChevronDown,
  Layers, Check, RefreshCw
} from 'lucide-react';
import { VideoItem, SponsorSegment, SponsorBlockSettings, PlaybackQuality } from '../types';
import { 
  fetchSponsorSegments, 
  checkSkipCondition, 
  CATEGORY_COLORS 
} from '../services/sponsorBlock';
import { formatDuration, resolveDirectStream } from '../services/youtubeApi';
import { triggerHaptic, getTelegram } from '../services/telegram';
import { recordServerWatch } from '../services/innerTubeClient';

interface VideoPlayerProps {
  video: VideoItem;
  settings: SponsorBlockSettings;
  onUpdateSettings: (settings: SponsorBlockSettings) => void;
  onClose?: () => void;
  isMini?: boolean;
  onToggleMini?: () => void;
}

type PlayerMode = 'shielded' | 'direct_mp4';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  settings,
  onUpdateSettings,
  onClose,
  isMini = false,
  onToggleMini
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mode: 'shielded' (YouTube player with controls=0 + invisible click shield preventing any links to YouTube)
  // or 'direct_mp4' (Native HTML5 <video> with direct stream)
  const [mode, setMode] = useState<PlayerMode>('shielded');

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(video.duration || 300);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<any>(null);

  // Quality & Speed
  const [quality, setQuality] = useState<PlaybackQuality>('720p');
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Direct MP4 stream source
  const [directStreamUrl, setDirectStreamUrl] = useState<string>(
    video.directStreamUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  );

  // SponsorBlock state
  const [segments, setSegments] = useState<SponsorSegment[]>([]);
  const [isLoadingSegments, setIsLoadingSegments] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<{
    segment: SponsorSegment;
    duration: number;
    timer: any;
  } | null>(null);
  const [lastSkippedUuid, setLastSkippedUuid] = useState<string | null>(null);

  // PostMessage helper for YouTube IFrame API
  const postIframeCommand = useCallback((func: string, args: any[] = []) => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          '*'
        );
      }
    } catch (e) {
      console.warn('IFrame postMessage error:', e);
    }
  }, []);

  // Fetch SponsorBlock segments and prepare stream on video change
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingSegments(true);
    setSegments([]);
    setCurrentTime(0);
    setHasStarted(false);

    // Resolve direct stream URL if user switches to MP4 mode
    resolveDirectStream(video.id, quality).then((url) => {
      if (!isCancelled) {
        setDirectStreamUrl(url);
      }
    });

    // Fetch SponsorBlock
    fetchSponsorSegments(video.id).then((loaded) => {
      if (!isCancelled) {
        setSegments(loaded);
        setIsLoadingSegments(false);
      }
    });

    // Record watch in official YouTube history
    recordServerWatch(video.id);

    return () => {
      isCancelled = true;
    };
  }, [video.id, quality]);

  // Handle incoming messages from YouTube IFrame
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;

        // Player state changes
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number') {
            setCurrentTime(data.info.currentTime);
          }
          if (typeof data.info.duration === 'number' && data.info.duration > 0) {
            setDuration(data.info.duration);
          }
          if (typeof data.info.playerState === 'number') {
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            if (data.info.playerState === 1) {
              setIsPlaying(true);
              setHasStarted(true);
            } else if (data.info.playerState === 2) {
              setIsPlaying(false);
            }
          }
        }
      } catch (err) {
        // Ignore non-json messages from other extensions/scripts
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send listening handshake to iframe when it loads
  const handleIframeLoad = () => {
    postIframeCommand('listening');
    postIframeCommand('addEventListener', ['onStateChange']);
    postIframeCommand('addEventListener', ['infoDelivery']);
    setHasStarted(true);
  };

  // Playback timer & SponsorBlock auto-skipper
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying) return;

      // In shielded mode, we advance time and query position
      let cur = currentTime;
      if (mode === 'shielded') {
        cur = currentTime + 0.5;
        setCurrentTime(cur);
      } else if (mode === 'direct_mp4' && videoRef.current) {
        cur = videoRef.current.currentTime;
        setCurrentTime(cur);
        if (videoRef.current.duration) {
          setDuration(videoRef.current.duration);
        }
      }

      // Check SponsorBlock
      const result = checkSkipCondition(cur, segments, settings);
      if (result.shouldSkip && result.segment && result.skipToTime) {
        if (lastSkippedUuid !== result.segment.UUID) {
          setLastSkippedUuid(result.segment.UUID);
          const skipDuration = Math.round(result.segment.segment[1] - result.segment.segment[0]);

          // Jump video ahead
          if (mode === 'shielded') {
            postIframeCommand('seekTo', [result.skipToTime, true]);
          } else if (mode === 'direct_mp4' && videoRef.current) {
            videoRef.current.currentTime = result.skipToTime;
          }
          setCurrentTime(result.skipToTime);
          triggerHaptic('success');

          // Update saved statistics
          onUpdateSettings({
            ...settings,
            savedSecondsTotal: settings.savedSecondsTotal + skipDuration,
            skippedSegmentsCount: settings.skippedSegmentsCount + 1
          });

          // Show skip toast
          if (settings.showSkipToast) {
            if (activeToast?.timer) clearTimeout(activeToast.timer);
            const timer = setTimeout(() => setActiveToast(null), 4500);
            setActiveToast({
              segment: result.segment,
              duration: skipDuration,
              timer
            });
          }
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, currentTime, mode, segments, settings, lastSkippedUuid, activeToast, postIframeCommand, onUpdateSettings]);

  // Auto-hide controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3200);
  };

  const togglePlay = () => {
    triggerHaptic('light');
    if (mode === 'shielded') {
      if (isPlaying) {
        postIframeCommand('pauseVideo');
        setIsPlaying(false);
      } else {
        postIframeCommand('playVideo');
        setIsPlaying(true);
      }
    } else if (mode === 'direct_mp4' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (mode === 'shielded') {
      postIframeCommand('seekTo', [newTime, true]);
    } else if (mode === 'direct_mp4' && videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    triggerHaptic('selection');
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (mode === 'shielded') {
      if (nextMute) {
        postIframeCommand('mute');
      } else {
        postIframeCommand('unMute');
      }
    } else if (mode === 'direct_mp4' && videoRef.current) {
      videoRef.current.muted = nextMute;
    }
  };

  const handleSpeedChange = (speed: number) => {
    triggerHaptic('selection');
    setPlaybackRate(speed);
    if (mode === 'shielded') {
      postIframeCommand('setPlaybackRate', [speed]);
    } else if (mode === 'direct_mp4' && videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    triggerHaptic('selection');
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleShareToTelegram = () => {
    triggerHaptic('light');
    const tg = getTelegram();
    const currentMin = Math.floor(currentTime / 60);
    const currentSec = Math.floor(currentTime % 60);
    const shareText = `Дивлюсь у TubeGram без реклами: "${video.title}" (Таймкод: ${currentMin}:${currentSec < 10 ? '0' : ''}${currentSec})`;
    
    // Internal app sharing (NEVER sends to youtube.com!)
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?text=${encodeURIComponent(shareText)}`);
    } else {
      navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const undoSkip = () => {
    triggerHaptic('light');
    if (activeToast && activeToast.segment) {
      const prevTime = Math.max(0, activeToast.segment.segment[0] - 0.5);
      handleSeek(prevTime);
      setActiveToast(null);
    }
  };

  // Mini-player view (floating in corner)
  if (isMini) {
    return (
      <div className="fixed bottom-18 left-3 right-3 z-40 bg-slate-900/95 border border-slate-750 rounded-2xl p-2 shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in duration-200">
        <div 
          onClick={onToggleMini} 
          className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black cursor-pointer shrink-0"
        >
          <img 
            src={video.thumbnail} 
            alt={video.title} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-white" />
          </div>
        </div>

        <div onClick={onToggleMini} className="flex-1 min-w-0 cursor-pointer">
          <p className="text-xs font-semibold text-white truncate">{video.title}</p>
          <p className="text-[11px] text-slate-400 truncate">{video.channelTitle}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full text-slate-400 hover:text-white flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>
      </div>
    );
  }

  // YouTube embed origin URL without controls and without clickability
  const originParam = typeof window !== 'undefined' ? window.location.origin : '';
  const shieldedEmbedUrl = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&origin=${encodeURIComponent(originParam)}`;

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="relative w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800/80 mb-5"
    >
      {/* Active SponsorBlock Skip Notification Toast */}
      {activeToast && (
        <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-950/95 border border-emerald-500/60 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <FastForward className="w-3.5 h-3.5 fill-current" />
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                Пропущено: {CATEGORY_COLORS[activeToast.segment.category]?.label || 'рекламний блок'}
              </p>
              <p className="text-[11px] text-emerald-400 font-mono">
                +{activeToast.duration} сек заощаджено
              </p>
            </div>
          </div>
          <button
            onClick={undoSkip}
            className="px-2.5 py-1 text-[11px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors whitespace-nowrap active:scale-95"
          >
            Скасувати
          </button>
        </div>
      )}

      {/* Main Video Viewport (16:9 ratio) */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {mode === 'shielded' ? (
          <iframe
            ref={iframeRef}
            src={shieldedEmbedUrl}
            title={video.title}
            onLoad={handleIframeLoad}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full border-0 pointer-events-none scale-102"
          />
        ) : (
          <video
            ref={videoRef}
            src={directStreamUrl}
            autoPlay
            playsInline
            controls={false}
            className="w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* 
          CRITICAL CLICK-SHIELD LAYER: 
          Captures ALL user taps & clicks on the video area!
          Prevents the user from clicking any YouTube links, title, logo, or recommendations!
        */}
        <div 
          onClick={togglePlay}
          className="absolute inset-0 z-20 cursor-pointer"
        />

        {/* Gradient Scrim */}
        <div 
          onClick={togglePlay}
          className={`absolute inset-0 z-20 bg-gradient-to-t from-black/85 via-transparent to-black/35 transition-opacity duration-300 pointer-events-none ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Center Play/Pause button */}
        {showControls && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="pointer-events-auto w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl hover:bg-red-500 hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Top-Right Badges: Zero-Ad & Engine Toggle */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-[11px] font-medium backdrop-blur-md shadow-sm">
            <Shield className="w-3 h-3" />
            <span>0% Реклами</span>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              setMode(mode === 'shielded' ? 'direct_mp4' : 'shielded');
            }}
            className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-mono backdrop-blur-md transition-colors flex items-center gap-1 active:scale-95"
            title="Перемкнути рушій відтворення"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>{mode === 'shielded' ? 'Захищений плеєр' : 'Прямий MP4'}</span>
          </button>
        </div>

        {/* Custom Video Controls Bar */}
        <div className={`absolute bottom-0 left-0 right-0 z-30 p-3 pt-6 bg-gradient-to-t from-black via-black/85 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Timeline Scrubber with SponsorBlock Colored Markers (Like SmartTube) */}
          <div className="relative w-full h-3.5 flex items-center group cursor-pointer mb-2">
            {/* Background track */}
            <div className="relative w-full h-1.5 group-hover:h-2.5 bg-slate-800 rounded-full overflow-hidden transition-all">
              {/* Progress bar */}
              <div 
                className="h-full bg-red-600 rounded-full"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />

              {/* SponsorBlock segments rendered on timeline */}
              {segments.map((seg, idx) => {
                const startPct = (seg.segment[0] / duration) * 100;
                const widthPct = ((seg.segment[1] - seg.segment[0]) / duration) * 100;
                const catMeta = CATEGORY_COLORS[seg.category] || CATEGORY_COLORS.sponsor;

                return (
                  <div
                    key={idx}
                    title={`${catMeta.label}: ${formatDuration(seg.segment[0])} - ${formatDuration(seg.segment[1])}`}
                    className="absolute top-0 bottom-0 pointer-events-none rounded-sm shadow-sm"
                    style={{
                      left: `${Math.min(startPct, 98)}%`,
                      width: `${Math.max(widthPct, 1)}%`,
                      backgroundColor: catMeta.bg
                    }}
                  />
                );
              })}
            </div>

            {/* Range input on top for scrubbing */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-7 h-7 flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={toggleMute}
                className="w-7 h-7 flex items-center justify-center text-slate-200 hover:text-white active:scale-95"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              {/* SponsorBlock segments counter */}
              {segments.length > 0 && (
                <div className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 rounded">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{segments.length} рекламних відрізки</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Speed selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowQualityMenu(false);
                  }}
                  className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800/80 rounded"
                >
                  {playbackRate}x
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-8 right-0 bg-slate-900 border border-slate-750 rounded-lg py-1 shadow-xl z-50 flex flex-col min-w-[70px]">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handleSpeedChange(rate)}
                        className={`px-3 py-1 text-left text-xs font-mono hover:bg-slate-800 ${
                          playbackRate === rate ? 'text-red-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mini Player */}
              {onToggleMini && (
                <button
                  onClick={onToggleMini}
                  className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white"
                  title="Згорнути в міні-плеєр"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Details & SponsorBlock Timeline Breakdown */}
      <div className="p-4 bg-slate-950 border-t border-slate-850">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white text-balance leading-snug">
              {video.title}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">{video.channelTitle}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="tabular-nums">{video.views} переглядів</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{video.publishedTime}</span>
            </div>
          </div>

          <button
            onClick={handleShareToTelegram}
            className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Скопійовано</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Поділитись</span>
              </>
            )}
          </button>
        </div>

        {/* SponsorBlock Legend & Detected Segments (SmartTube style) */}
        <div className="mt-4 p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>SponsorBlock (SmartTube Модуль)</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">
              Автопропуск Увімкнено
            </span>
          </div>

          {isLoadingSegments ? (
            <p className="text-xs text-slate-400">Завантаження міток реклами...</p>
          ) : segments.length === 0 ? (
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>У цьому відео немає спонсорських перебивок.</span>
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-400">
                Виявлено {segments.length} сегмент{segments.length > 1 ? 'и' : ''} для автоматичного пропуску:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {segments.map((seg, i) => {
                  const meta = CATEGORY_COLORS[seg.category] || CATEGORY_COLORS.sponsor;
                  const [start, end] = seg.segment;
                  const segDuration = Math.round(end - start);

                  return (
                    <div 
                      key={i}
                      onClick={() => handleSeek(start)}
                      className="cursor-pointer flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors active:scale-98"
                    >
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0" 
                          style={{ backgroundColor: meta.bg }} 
                        />
                        <span className="text-xs text-slate-300 font-medium">
                          {meta.label}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {formatDuration(start)} - {formatDuration(end)} ({segDuration}с)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
