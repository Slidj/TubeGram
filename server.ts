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
let userInfo: { name: string; avatar?: string } | null = null;

// Helper to recursively extract videos from TV browse renderers
function extractVideosFromTv(obj: any, found: any[] = []): any[] {
  if (!obj || typeof obj !== 'object') return found;

  if (obj.tileRenderer && obj.tileRenderer.contentId) {
    const t = obj.tileRenderer;
    const title =
      t.metadata?.tileMetadataRenderer?.title?.simpleText ||
      t.header?.tileHeaderRenderer?.headline?.simpleText ||
      'Відео';
    const author =
      t.metadata?.tileMetadataRenderer?.lines?.[0]?.lineRenderer?.items?.[0]?.lineItemRenderer?.text?.runs?.[0]?.text ||
      'Автор';
    const views =
      t.metadata?.tileMetadataRenderer?.lines?.[1]?.lineRenderer?.items?.[1]?.lineItemRenderer?.text?.simpleText ||
      t.metadata?.tileMetadataRenderer?.lines?.[1]?.lineRenderer?.items?.[0]?.lineItemRenderer?.text?.simpleText ||
      'Перегляд';
    const published =
      t.metadata?.tileMetadataRenderer?.lines?.[1]?.lineRenderer?.items?.[3]?.lineItemRenderer?.text?.simpleText ||
      'Нещодавно';
    const duration =
      t.header?.tileHeaderRenderer?.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)
        ?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '10:00';
    const thumb =
      t.header?.tileHeaderRenderer?.thumbnail?.thumbnails?.[0]?.url ||
      `https://i.ytimg.com/vi/${t.contentId}/hqdefault.jpg`;

    // Deduplicate by video ID
    if (!found.some((v) => v.id === t.contentId)) {
      found.push({
        id: t.contentId,
        title,
        channelTitle: author,
        views,
        publishedTime: published,
        duration: 300,
        durationFormatted: duration,
        description: `Відео з вашого акаунта YouTube від каналу ${author}`,
        thumbnail: thumb,
        sponsorCount: 1
      });
    }
    return found;
  }

  for (const key of Object.keys(obj)) {
    extractVideosFromTv(obj[key], found);
  }
  return found;
}

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
    // Read from recent history or account
    const hist = await innertube.actions.execute('/browse', { browseId: 'FEhistory', client: 'TV' });
    const videos = extractVideosFromTv(hist.data);
    userInfo = {
      name: 'Синхронізовано з YouTube',
      avatar: videos[0]?.thumbnail || undefined
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

  const pending: any = currentPendingAuth;
  if (pending) {
    return res.json({
      loggedIn: false,
      pending: true,
      user_code: pending.user_code,
      verification_url: pending.verification_url
    });
  }

  try {
    innertube.session.signIn().catch((err) => {
      console.warn('Sign-in wait completed or expired:', err?.message);
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const checkPending: any = currentPendingAuth;
    if (checkPending) {
      return res.json({
        loggedIn: false,
        pending: true,
        user_code: checkPending.user_code,
        verification_url: checkPending.verification_url
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

// API: Real Personalized Home Feed (Recommendations via TV client)
app.get('/api/youtube/home', async (req, res) => {
  if (!innertube) {
    return res.status(500).json({ error: 'Плеєр завантажується...' });
  }

  try {
    if (isLoggedIn) {
      const response = await innertube.actions.execute('/browse', {
        browseId: 'FEwhat_to_watch',
        client: 'TV'
      });
      const videos = extractVideosFromTv(response.data);
      return res.json({ videos, isPersonalized: true });
    }

    // Default web search feed if not logged in
    const search = await innertube.search('trending music tech');
    const videos = search.videos.slice(0, 20).map((v: any) => ({
      id: v.id,
      title: v.title?.text || 'Відео',
      channelTitle: v.author?.name || 'YouTube',
      views: v.short_view_count?.text || 'Перегляд',
      publishedTime: v.published?.text || 'Нещодавно',
      duration: v.duration?.seconds || 300,
      durationFormatted: v.duration?.text || '05:00',
      description: v.description_snippet?.text || '',
      thumbnail: v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      sponsorCount: 1
    }));
    res.json({ videos, isPersonalized: false });
  } catch (err: any) {
    console.warn('Home feed fetch fallback:', err?.message);
    res.json({ videos: [], isPersonalized: false });
  }
});

// API: Real Subscriptions Feed (SmartTube style via TV client)
app.get('/api/youtube/subscriptions', async (req, res) => {
  if (!innertube || !isLoggedIn) {
    return res.status(401).json({ error: 'Потрібна авторизація для перегляду підписок' });
  }

  try {
    const response = await innertube.actions.execute('/browse', {
      browseId: 'FEsubscriptions',
      client: 'TV'
    });
    const videos = extractVideosFromTv(response.data);

    // Extract unique channels
    const channelsMap = new Map();
    videos.forEach((v: any) => {
      if (v.channelTitle && !channelsMap.has(v.channelTitle)) {
        channelsMap.set(v.channelTitle, {
          id: `ch-${v.channelTitle}`,
          channelId: `ch-${v.channelTitle}`,
          title: v.channelTitle,
          description: 'Підписка з вашого акаунта YouTube',
          thumbnail: v.thumbnail || ''
        });
      }
    });

    res.json({
      channels: Array.from(channelsMap.values()),
      videos
    });
  } catch (err: any) {
    console.error('Subscriptions fetch error:', err?.message);
    res.status(500).json({ error: err?.message || 'Не вдалося завантажити підписки' });
  }
});

// API: Real Watch History (SmartTube style via TV client)
app.get('/api/youtube/history', async (req, res) => {
  if (!innertube || !isLoggedIn) {
    return res.status(401).json({ error: 'Потрібна авторизація для перегляду історії' });
  }

  try {
    const response = await innertube.actions.execute('/browse', {
      browseId: 'FEhistory',
      client: 'TV'
    });
    const videos = extractVideosFromTv(response.data);
    res.json({ videos });
  } catch (err: any) {
    console.error('History fetch error:', err?.message);
    res.status(500).json({ error: err?.message || 'Не вдалося завантажити історію' });
  }
});

// API: Record watch time to official YouTube history!
app.post('/api/youtube/history/record', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId || !innertube || !isLoggedIn) {
    return res.json({ recorded: false });
  }

  try {
    const info = (await innertube.getInfo(videoId, { client: 'TV' })) as any;
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
