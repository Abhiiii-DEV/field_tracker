import { http, tokenStore } from './client';
import type { User, SelfStats, ClientConfig, QueuedPoint } from '../types';

interface DeviceInfo {
  os?: string;
  osVersion?: string;
  model?: string;
  brand?: string;
  batteryLevel?: number;
  networkType?: string;
}

export async function login(
  email: string,
  password: string,
  deviceInfo?: DeviceInfo,
  appVersion?: string
): Promise<{ user: User; sessionId: string }> {
  const { data } = await http.post('/api/auth/login', {
    email,
    password,
    deviceInfo,
    appVersion,
  });
  await tokenStore.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return { user: data.user, sessionId: data.session?._id };
}

export async function logout(sessionId?: string): Promise<void> {
  try {
    await http.post('/api/auth/logout', { sessionId });
  } finally {
    await tokenStore.clear();
  }
}

export const getMe = () => http.get<{ user: User }>('/api/auth/me').then((r) => r.data.user);

export const getConfig = () => http.get<ClientConfig>('/api/config').then((r) => r.data);

export const getMyStats = () => http.get<SelfStats>('/api/me/stats').then((r) => r.data);

/** Upload one or many points (offline batches use the same endpoint). */
export const uploadPoints = (points: QueuedPoint[]) =>
  http.post('/api/track', { points }).then((r) => r.data);

export const reportTrackingEvent = (
  type: 'GPS_DISABLED' | 'PERMISSION_REVOKED' | 'TRACKING_INTERRUPTED',
  message?: string
) => http.post('/api/track/event', { type, message });
