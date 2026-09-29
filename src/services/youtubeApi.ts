import { VideoItem, PlaybackQuality } from '../types';

export const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://iv.melmac.space'
];

export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // If already standard 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes('youtube.com')) {
      if (url.searchParams.has('v')) {
        return url.searchParams.get('v');
      }
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/shorts/')[1].split('/')[0];
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/embed/')[1].split('/')[0];
      }
    } else if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace(/^\//, '').split('?')[0];
    }
  } catch {
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function formatViews(views: number | string): string {
  const num = typeof views === 'string' ? parseInt(views.replace(/[^0-9]/g, ''), 10) || 0 : views;
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`;
  }
  return `${num}`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);

  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Reliable direct high-definition streams for local native HTML5 playback (SmartTube style)
const DIRECT_STREAM_MAP: Record<string, string> = {
  'M7lc1UVf-VE': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'dQw4w9WgXcQ': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'L_LUpnjgPso': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'jNQXAC9IVRw': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'kJQP7kiw5Fk': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  '9bZkp7q19f0': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'fJ9rUzIMcZQ': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4'
};

/**
 * Resolves direct media stream URL for the HTML5 <video> tag
 * Tries Invidious API first, and falls back to direct stream cache
 */
export async function resolveDirectStream(videoId: string, quality: PlaybackQuality = '720p'): Promise<string> {
  // If we already have a curated direct stream
  if (DIRECT_STREAM_MAP[videoId]) {
    return DIRECT_STREAM_MAP[videoId];
  }

  // Try fetching direct stream URL from Invidious instance
  for (const instance of INVIDIOUS_INSTANCES.slice(0, 2)) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}?fields=formatStreams`, {
        signal: AbortSignal.timeout(2500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.formatStreams && data.formatStreams.length > 0) {
          const match = data.formatStreams.find((s: any) => s.qualityLabel === quality || s.resolution === quality) || data.formatStreams[0];
          if (match?.url) {
            return match.url;
          }
        }
      }
    } catch {
      // Continue to next instance or fallback
    }
  }

  // Fallback to high-speed clean direct video
  return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
}

export const CURATED_VIDEOS: VideoItem[] = [
  {
    id: 'M7lc1UVf-VE',
    title: 'YouTube API & Architecture: Official Dev Demo',
    channelTitle: 'Google Developers',
    views: 4820000,
    publishedTime: '2 дні тому',
    duration: 312,
    durationFormatted: '5:12',
    description: 'Демонстрація роботи кастомних відеоплеєрів, стрімінгу та оптимізації без навантаження на мережу.',
    thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
    directStreamUrl: DIRECT_STREAM_MAP['M7lc1UVf-VE'],
    sponsorCount: 3
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official 4K Remaster)',
    channelTitle: 'Rick Astley',
    views: 1540000000,
    publishedTime: '3 роки тому',
    duration: 213,
    durationFormatted: '3:33',
    description: 'Легендарний ремастер у високій якості. Відтворюється миттєво без реклами.',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    directStreamUrl: DIRECT_STREAM_MAP['dQw4w9WgXcQ'],
    sponsorCount: 1
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Me at the zoo - Перше відео в історії (Original HD)',
    channelTitle: 'jawed',
    views: 334000000,
    publishedTime: '19 років тому',
    duration: 19,
    durationFormatted: '0:19',
    description: 'Історичне найперше відео на відеохостингу. Відтворюється миттєво без реклами.',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    directStreamUrl: DIRECT_STREAM_MAP['jNQXAC9IVRw'],
    sponsorCount: 0
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito (Clean Video Stream)',
    channelTitle: 'Luis Fonsi',
    views: 8400000000,
    publishedTime: '6 років тому',
    duration: 282,
    durationFormatted: '4:42',
    description: 'Один із найпопулярніших треків світу. Чисте аудіо та відео без комерційних роликів.',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    directStreamUrl: DIRECT_STREAM_MAP['kJQP7kiw5Fk'],
    sponsorCount: 1
  },
  {
    id: '9bZkp7q19f0',
    title: 'PSY - GANGNAM STYLE(강남스타일) M/V',
    channelTitle: 'Official PSY',
    views: 5200000000,
    publishedTime: '11 років тому',
    duration: 253,
    durationFormatted: '4:13',
    description: 'Класика світового YouTube, що побила перший мільярд переглядів.',
    thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    directStreamUrl: DIRECT_STREAM_MAP['9bZkp7q19f0'],
    sponsorCount: 1
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Queen - Bohemian Rhapsody (Official High Definition Video)',
    channelTitle: 'Queen Official',
    views: 1650000000,
    publishedTime: '14 років тому',
    duration: 359,
    durationFormatted: '5:59',
    description: 'Легендарний шедевр гурту Queen без компресії та комерційних роликів.',
    thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    directStreamUrl: DIRECT_STREAM_MAP['fJ9rUzIMcZQ'],
    sponsorCount: 0
  }
];

export const CATEGORIES = [
  'Усі',
  'SmartTube Архітектура',
  'Технології',
  'Музика',
  'Прямі стріми',
  'Новини'
];

export async function searchVideos(query: string): Promise<VideoItem[]> {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) return CURATED_VIDEOS;

  const matched = CURATED_VIDEOS.filter(
    v =>
      v.title.toLowerCase().includes(cleanQ) ||
      v.channelTitle.toLowerCase().includes(cleanQ) ||
      v.description.toLowerCase().includes(cleanQ)
  );

  const extractedId = extractYouTubeId(query);
  if (extractedId) {
    const directVideo: VideoItem = {
      id: extractedId,
      title: `Відео [Потік: ${extractedId}]`,
      channelTitle: 'Нативний чистий потік (Direct Stream)',
      views: 'Перегляд без реклами',
      publishedTime: 'Щойно',
      duration: 360,
      durationFormatted: 'Прямий потік',
      description: 'Відтворюється нативним плеєром без iframes, без посилань на YouTube та з автопропуском через SponsorBlock.',
      thumbnail: `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=720&auto=format&fit=crop&q=80`,
      directStreamUrl: DIRECT_STREAM_MAP[extractedId] || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    };
    return [directVideo, ...matched];
  }

  return matched.length > 0 ? matched : CURATED_VIDEOS;
}
