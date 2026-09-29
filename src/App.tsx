import React, { useState, useEffect } from 'react';
import { ActiveTab, VideoItem, SponsorBlockSettings, UserAccountState } from './types';
import { CURATED_VIDEOS } from './services/youtubeApi';
import { loadSponsorSettings, saveSponsorSettings } from './services/sponsorBlock';
import { 
  initTelegramApp, 
  setTelegramBackButton, 
  triggerHaptic, 
  getTelegram 
} from './services/telegram';
import { loadStoredSubscriptions, SubscribedChannel } from './services/googleAuth';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { HomeFeed } from './components/HomeFeed';
import { VideoPlayer } from './components/VideoPlayer';
import { SubscriptionsTab } from './components/SubscriptionsTab';
import { SearchTab } from './components/SearchTab';
import { HistoryTab } from './components/HistoryTab';
import { SettingsTab } from './components/SettingsTab';
import { DeployGuideModal } from './components/DeployGuideModal';

const DEFAULT_ACCOUNT: UserAccountState = {
  isGoogleConnected: false,
  activeProfile: 'telegram',
  telegramUser: {
    name: 'Користувач Telegram',
    username: 'tg_user'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null);
  const [isMiniPlayer, setIsMiniPlayer] = useState<boolean>(false);
  const [history, setHistory] = useState<VideoItem[]>([]);
  const [settings, setSettings] = useState<SponsorBlockSettings>(loadSponsorSettings);
  const [accountState, setAccountState] = useState<UserAccountState>(() => {
    try {
      const saved = localStorage.getItem('tubegram_account');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ACCOUNT;
  });
  const [showDeployGuide, setShowDeployGuide] = useState<boolean>(false);

  // Initialize Telegram WebApp on launch
  useEffect(() => {
    initTelegramApp();

    // Check if running in Telegram and read Telegram user info
    const tg = getTelegram();
    if (tg?.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      setAccountState((prev) => ({
        ...prev,
        telegramUser: {
          name: `${u.first_name} ${u.last_name || ''}`.trim(),
          username: u.username,
          id: u.id
        }
      }));
    }

    // Load history from localStorage
    try {
      const savedHist = localStorage.getItem('tubegram_history');
      if (savedHist) {
        setHistory(JSON.parse(savedHist));
      }
    } catch (e) {
      console.warn('History load error', e);
    }
  }, []);

  // Sync Telegram BackButton with video state
  useEffect(() => {
    if (currentVideo && !isMiniPlayer) {
      setTelegramBackButton(true, () => {
        // When Telegram user presses back arrow in top left
        setIsMiniPlayer(true);
      });
    } else {
      setTelegramBackButton(false);
    }

    return () => {
      setTelegramBackButton(false);
    };
  }, [currentVideo, isMiniPlayer]);

  const handleSelectVideo = (video: VideoItem) => {
    triggerHaptic('medium');
    setCurrentVideo(video);
    setIsMiniPlayer(false);

    // Add to history without duplicates
    setHistory((prev) => {
      const updated = [video, ...prev.filter((v) => v.id !== video.id)].slice(0, 30);
      try {
        localStorage.setItem('tubegram_history', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSettings = (newSettings: SponsorBlockSettings) => {
    setSettings(newSettings);
    saveSponsorSettings(newSettings);
  };

  const handleUpdateAccount = (newAccount: UserAccountState) => {
    setAccountState(newAccount);
    try {
      localStorage.setItem('tubegram_account', JSON.stringify(newAccount));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('tubegram_history');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600/30 selection:text-white pb-20">
      {/* 3-Zone Top Navigation Contract */}
      <TopBar
        onOpenSearch={() => setActiveTab('search')}
        onOpenGuide={() => setShowDeployGuide(true)}
        onOpenProfile={() => setActiveTab('subscriptions')}
        accountState={accountState}
        savedSeconds={settings.savedSecondsTotal}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3.5 sm:px-6 pt-4 pb-8">
        {/* Active Full Player (if opened) */}
        {currentVideo && !isMiniPlayer && (
          <VideoPlayer
            video={currentVideo}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onClose={() => setCurrentVideo(null)}
            onToggleMini={() => setIsMiniPlayer(true)}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'home' && (
          <HomeFeed
            videos={CURATED_VIDEOS}
            currentVideo={currentVideo}
            onSelectVideo={handleSelectVideo}
            onOpenSearch={() => setActiveTab('search')}
            onOpenSubscriptions={() => setActiveTab('subscriptions')}
            subscribedChannels={loadStoredSubscriptions()}
          />
        )}

        {activeTab === 'trending' && (
          <HomeFeed
            videos={CURATED_VIDEOS.slice().reverse()}
            currentVideo={currentVideo}
            onSelectVideo={handleSelectVideo}
            onOpenSearch={() => setActiveTab('search')}
            onOpenSubscriptions={() => setActiveTab('subscriptions')}
            subscribedChannels={loadStoredSubscriptions()}
            isTrending={true}
          />
        )}

        {activeTab === 'subscriptions' && (
          <SubscriptionsTab
            accountState={accountState}
            onUpdateAccount={handleUpdateAccount}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {activeTab === 'search' && (
          <SearchTab onSelectVideo={handleSelectVideo} />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            history={history}
            accountState={accountState}
            onSelectVideo={handleSelectVideo}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenDeployGuide={() => setShowDeployGuide(true)}
            accountState={accountState}
            onOpenSubscriptions={() => setActiveTab('subscriptions')}
          />
        )}
      </main>

      {/* Floating Mini Player if minimized */}
      {currentVideo && isMiniPlayer && (
        <VideoPlayer
          video={currentVideo}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setCurrentVideo(null)}
          isMini={true}
          onToggleMini={() => setIsMiniPlayer(false)}
        />
      )}

      {/* Telegram Mini App & GitHub Deployment Guide Modal */}
      {showDeployGuide && (
        <DeployGuideModal onClose={() => setShowDeployGuide(false)} />
      )}

      {/* Bottom Ergonomic Navigation Bar for Touch Devices */}
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isGoogleConnected={accountState.isGoogleConnected}
      />
    </div>
  );
}
