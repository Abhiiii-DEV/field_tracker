import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { storage } from '../utils';
import type { AuthTokens } from '../types';

// Point this at your backend. For a device on the same LAN use the host's IP.
export const API_BASE = 'http://192.168.5.82:4000';

const TOKENS_KEY = 'ft_tokens';

export const tokenStore = {
  get: () => storage.get<AuthTokens>(TOKENS_KEY),
  set: (t: AuthTokens) => storage.set(TOKENS_KEY, t),
  clear: () => storage.remove(TOKENS_KEY),
};

let onForcedLogout: (() => void) | null = null;
export const setForcedLogoutHandler = (fn: () => void) => {
  onForcedLogout = fn;
};

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const tokens = await tokenStore.get();
  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const tokens = await tokenStore.get();
  if (!tokens?.refreshToken) return false;
  try {
    const res = await axios.post(`${API_BASE}/api/auth/refresh`, {
      refreshToken: tokens.refreshToken,
    });
    await tokenStore.set({
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    });
    return true;
  } catch {
    return false;
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshTokens();
      const ok = await refreshing;
      refreshing = null;
      if (ok) {
        const tokens = await tokenStore.get();
        original.headers.set('Authorization', `Bearer ${tokens?.accessToken}`);
        return http(original);
      }
      await tokenStore.clear();
      onForcedLogout?.();
    }
    return Promise.reject(error);
  }
);
