import { VideoItem } from '../types';

export interface DeviceAuthResponse {
  loggedIn: boolean;
  pending?: boolean;
  user_code?: string;
  verification_url?: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

export async function getDeviceAuth(): Promise<DeviceAuthResponse> {
  try {
    const res = await fetch('/api/youtube/auth/device');
    return await res.json();
  } catch (e: any) {
    return { loggedIn: false, pending: false };
  }
}

export async function getAuthStatus(): Promise<DeviceAuthResponse> {
  try {
    const res = await fetch('/api/youtube/auth/status');
    return await res.json();
  } catch (e: any) {
    return { loggedIn: false };
  }
}

export async function logoutDevice(): Promise<void> {
  try {
    await fetch('/api/youtube/auth/logout', { method: 'POST' });
  } catch (e) {}
}

export async function fetchServerHomeFeed(): Promise<{ videos: VideoItem[]; isPersonalized: boolean }> {
  try {
    const res = await fetch('/api/youtube/home');
    if (!res.ok) throw new Error('Failed to fetch home feed');
    return await res.json();
  } catch (e) {
    return { videos: [], isPersonalized: false };
  }
}

export async function fetchServerSubscriptions(): Promise<{ channels: any[]; videos: VideoItem[] }> {
  try {
    const res = await fetch('/api/youtube/subscriptions');
    if (!res.ok) throw new Error('Failed to fetch subscriptions');
    return await res.json();
  } catch (e) {
    return { channels: [], videos: [] };
  }
}

export async function fetchServerHistory(): Promise<VideoItem[]> {
  try {
    const res = await fetch('/api/youtube/history');
    if (!res.ok) return [];
    const data = await res.json();
    return data.videos || [];
  } catch (e) {
    return [];
  }
}

export async function recordServerWatch(videoId: string): Promise<void> {
  try {
    await fetch('/api/youtube/history/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });
  } catch (e) {}
}
