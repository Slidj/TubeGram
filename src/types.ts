export type SponsorCategory = 
  | 'sponsor'
  | 'selfpromo'
  | 'interaction'
  | 'intro'
  | 'outro'
  | 'preview'
  | 'music_offtopic';

export interface SponsorSegment {
  category: SponsorCategory;
  actionType: 'skip' | 'mute';
  segment: [number, number]; // [startSeconds, endSeconds]
  UUID: string;
  videoDuration?: number;
}

export interface VideoItem {
  id: string;
  title: string;
  channelTitle: string;
  channelId?: string;
  channelAvatar?: string;
  views: number | string;
  publishedTime: string;
  duration: number; // in seconds
  durationFormatted: string;
  description: string;
  thumbnail: string;
  directStreamUrl?: string;
  sponsorCount?: number;
}

export interface SponsorBlockSettings {
  enabled: boolean;
  autoSkipSponsor: boolean;
  autoSkipSelfPromo: boolean;
  autoSkipInteraction: boolean;
  autoSkipIntroOutro: boolean;
  showSkipToast: boolean;
  hapticFeedback: boolean;
  savedSecondsTotal: number;
  skippedSegmentsCount: number;
}

export type PlaybackQuality = '1080p' | '720p' | '480p' | '360p' | 'audio';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  quality: PlaybackQuality;
  isMini: boolean;
}

export type ActiveTab = 'home' | 'trending' | 'subscriptions' | 'search' | 'history' | 'settings';

export interface UserAccountState {
  isGoogleConnected: boolean;
  activeProfile: 'telegram' | 'google';
  googleUser?: {
    name: string;
    email: string;
    photoURL?: string;
  };
  telegramUser?: {
    name: string;
    username?: string;
    id?: number;
  };
}
