import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Innertube, UniversalCache } from 'youtubei.js';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Persistent session file path
const SESSION_FILE = path.resolve(process.cwd(), '.yt-session.json');

let innertube: Innertube | null = null;
let currentPendingAuth: {
  user_code: string;
  verification_url: string;
  expires_in: number;
} | null = null;
let isLoggedIn = false;
let userInfo: { name: string; email?: string; avatar?: string } | null = null;

// Initialize InnerTube
async function initInnertube() {
  try {
    let savedCredentials = undefined;
    if (fs.existsSync(SESSION_FILE)) {
      try {
        savedCredentials = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      } catch (e) {
        console.warn('Failed to parse saved session', e);
      }
    }

    innertube = await Innertube.create({
      cache: new UniversalCache(true, path.resolve(process.cwd(), '.cache'))
    });

    innertube.session.on('auth-pending', (data) => {
      console.log('InnerTube auth pending:', data.user_code, data.verification_url);
      currentPendingAuth = {
        user_code: data.user_code,
        verification_url: data.verification_url,
        expires_in: data.expires_in
      };
    });

    innertube.session.on('auth', ({ credentials }) => {
      console.log('InnerTube successfully authenticated!');
      isLoggedIn = true;
      currentPendingAuth = null;
      try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(credentials, null, 2));
      } catch (err) {
        console.error('Failed to save session file', err);
      }
      fetchUserInfo();
    });

    innertube.session.on('update-credentials', ({ credentials }) => {
      try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(credentials, null, 2));
      } catch (e) {}
    });

    if (savedCredentials) {
      await innertube.session.signIn(savedCredentials);
      isLoggedIn = true;
      fetchUserInfo();
    }
  } catch (err) {
    console.error('InnerTube init error:', err);
  }
}

async function fetchUserInfo() {
  if (!innertube || !isLoggedIn) return;
  try {
    const info = (await innertube.account.getInfo()) as any;
    userInfo = {
      name: info?.contents?.headers?.[0]?.title?.toString() || info?.contents?.header?.[0]?.title?.toString() || 'Мій YouTube Акаунт',
      avatar: info?.contents?.headers?.[0]?.thumbnail?.[0]?.url || info?.contents?.header?.[0]?.thumbnail?.[0]?.url || undefined
    };
  } catch (e) {
    userInfo = { name: 'YouTube Акаунт' };
  }
}

initInnertube();

// API: Start / Check TV Device Code Authentication (SmartTube method)
app.get('/api/youtube/auth/device', async (req, res) => {
  if (!innertube) {
    return res.status(500).json({ error: 'Плеєр ініціалізується, зачекайте кілька секунд...' });
  }

  if (isLoggedIn) {
    return res.json({ loggedIn: true, user: userInfo });
  }

  // If already have pending code
  if (currentPendingAuth) {
    return res.json({
      loggedIn: false,
      pending: true,
      user_code: currentPendingAuth.user_code,
      verification_url: currentPendingAuth.verification_url
    });
  }

  // Start signIn flow
  try {
    innertube.session.signIn().catch((err) => {
      console.warn('Sign-in wait completed or expired:', err?.message);
    });

    // Wait a brief moment for 'auth-pending' event
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const pending: any = currentPendingAuth;
    if (pending) {
      return res.json({
        loggedIn: false,
        pending: true,
        user_code: pending.user_code,
        verification_url: pending.verification_url
      });
    }

    res.json({ loggedIn: false, pending: false, message: 'Отримання коду...' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Помилка авторизації' });
  }
});

// API: Auth status
app.get('/api/youtube/auth/status', (req, res) => {
  res.json({
    loggedIn: isLoggedIn,
    user: userInfo,
    pendingAuth: currentPendingAuth
  });
});

// API: Logout
app.post('/api/youtube/auth/logout', async (req, res) => {
  isLoggedIn = false;
  userInfo = null;
  currentPendingAuth = null;
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
    if (innertube) {
      await innertube.session.signOut();
    }
  } catch (e) {}
  res.json({ success: true });
});

// Helper to format video items
function formatVideoItem(video: any) {
  return {
    id: video.id || video.video_id,
    title: video.title?.text || video.title?.toString() || 'Відео',
    channelTitle: video.author?.name || video.short_byline?.text || video.channel?.name || 'YouTube Автор',
    views: video.view_count?.text || video.short_view_count?.text || 'Перегляд',
    publishedTime: video.published?.text || 'Нещодавно',
    duration: video.duration?.seconds || 300,
    durationFormatted: video.duration?.text || '05:00',
    description: video.description_snippet?.text || '',
    thumbnail: video.thumbnails?.[video.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    sponsorCount: 1
  };
}

// API: Real Personalized Home Feed (Recommendations)
app.get('/api/youtube/home', async (req, res) => {
  if (!innertube) {
    return res.status(500).json({ error: 'Плеєр завантажується...' });
  }

  try {
    const feed = await innertube.getHomeFeed();
    const videos = feed.videos.slice(0, 20).map(formatVideoItem);
    res.json({ videos, isPersonalized: isLoggedIn });
  } catch (err: any) {
    console.warn('Home feed fetch warning:', err?.message);
    res.json({ videos: [], isPersonalized: false, error: err.message });
  }
});

// API: Real Subscriptions Feed (SmartTube style)
app.get('/api/youtube/subscriptions', async (req, res) => {
  if (!innertube || !isLoggedIn) {
    return res.status(401).json({ error: 'Потрібна авторизація для перегляду підписок' });
  }

  try {
    const subsFeed = await innertube.getSubscriptionsFeed();
    const videos = subsFeed.videos.slice(0, 30).map(formatVideoItem);

    // Extract unique channels
    const channelsMap = new Map();
    videos.forEach((v) => {
      if (v.channelTitle && !channelsMap.has(v.channelTitle)) {
        channelsMap.set(v.channelTitle, {
          id: `ch-${v.channelTitle}`,
          channelId: `ch-${v.channelTitle}`,
          title: v.channelTitle,
          description: 'Підписка з вашого акаунта YouTube',
          thumbnail: ''
        });
      }
    });

    res.json({
      channels: Array.from(channelsMap.values()),
      videos
    });
  } catch (err: any) {
    console.error('Subscriptions fetch error:', err);
    res.status(500).json({ error: err.message || 'Не вдалося завантажити підписки' });
  }
});

// API: Real Watch History (SmartTube style)
app.get('/api/youtube/history', async (req, res) => {
  if (!innertube || !isLoggedIn) {
    return res.status(401).json({ error: 'Потрібна авторизація для перегляду історії' });
  }

  try {
    const history = await innertube.getHistory();
    const videos = history.videos.slice(0, 30).map(formatVideoItem);
    res.json({ videos });
  } catch (err: any) {
    console.error('History fetch error:', err);
    res.status(500).json({ error: err.message || 'Не вдалося завантажити історію' });
  }
});

// API: Record watch time to official YouTube history!
app.post('/api/youtube/history/record', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId || !innertube || !isLoggedIn) {
    return res.json({ recorded: false });
  }

  try {
    const info = (await innertube.getInfo(videoId)) as any;
    // Send playback stats ping to register in YouTube history
    if (info?.playback_tracking?.videostats_playback_url) {
      await innertube.session.http.fetch(info.playback_tracking.videostats_playback_url.toString()).catch(() => {});
    }
    if (info?.playback_tracking?.videostats_watchtime_url) {
      await innertube.session.http.fetch(info.playback_tracking.videostats_watchtime_url.toString()).catch(() => {});
    }
    res.json({ recorded: true });
  } catch (e) {
    res.json({ recorded: false });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`TubeGram SmartTube Engine running on port ${PORT}`);
  });
}

startServer();
