import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import * as api from '../api';
import { tokenStore } from '../api/client';
import { storage } from '../utils';
import type { User } from '../types';

const SESSION_KEY = 'ft_session_id';

interface AuthState {
  user: User | null;
  sessionId: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
  bootstrapped: boolean;
}

const initialState: AuthState = {
  user: null,
  sessionId: null,
  status: 'idle',
  error: null,
  bootstrapped: false,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const tokens = await tokenStore.get();
  if (!tokens?.accessToken) return { user: null, sessionId: null };
  const user = await api.getMe();
  const sessionId = await storage.get<string>(SESSION_KEY);
  return { user, sessionId };
});

export const login = createAsyncThunk(
  'auth/login',
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const deviceInfo = {
        os: Platform.OS,
        osVersion: String(Platform.Version),
        model: DeviceInfo.getModel(),
        brand: await DeviceInfo.getBrand(),
        batteryLevel: Math.round((await DeviceInfo.getBatteryLevel()) * 100),
        networkType: undefined,
      };
      const appVersion = DeviceInfo.getVersion();
      const { user, sessionId } = await api.login(
        creds.email,
        creds.password,
        deviceInfo,
        appVersion
      );
      if (user.role !== 'salesperson') {
        await tokenStore.clear();
        return rejectWithValue('This app is for field salespeople.');
      }
      await storage.set(SESSION_KEY, sessionId);
      return { user, sessionId };
    } catch (e) {
      const msg =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any)?.response?.data?.error?.message ?? 'Sign in failed. Check your details.';
      return rejectWithValue(msg);
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionId = (getState() as any).auth.sessionId as string | null;
  await api.logout(sessionId ?? undefined);
  await storage.remove(SESSION_KEY);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    forceLogout(state) {
      state.user = null;
      state.sessionId = null;
      state.status = 'idle';
    },
  },
  extraReducers: (b) => {
    b.addCase(bootstrapAuth.fulfilled, (state, a: PayloadAction<{ user: User | null; sessionId: string | null }>) => {
      state.user = a.payload.user;
      state.sessionId = a.payload.sessionId;
      state.status = a.payload.user ? 'authenticated' : 'idle';
      state.bootstrapped = true;
    });
    b.addCase(bootstrapAuth.rejected, (state) => {
      state.bootstrapped = true;
      state.status = 'idle';
    });
    b.addCase(login.pending, (state) => {
      state.status = 'loading';
      state.error = null;
    });
    b.addCase(login.fulfilled, (state, a) => {
      state.user = a.payload.user;
      state.sessionId = a.payload.sessionId;
      state.status = 'authenticated';
    });
    b.addCase(login.rejected, (state, a) => {
      state.status = 'error';
      state.error = (a.payload as string) ?? 'Sign in failed';
    });
    b.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.sessionId = null;
      state.status = 'idle';
    });
  },
});

export const { forceLogout } = authSlice.actions;
export default authSlice.reducer;
