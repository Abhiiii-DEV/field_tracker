import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '../api';
import { BackgroundTracker } from '../services/location/BackgroundTracker';
import { requestAllPermissions, checkPermissions, PermissionState } from '../services/permissions/permissions';
import type { SelfStats } from '../types';

interface TrackingState {
  permissions: PermissionState;
  isTracking: boolean;
  stats: SelfStats | null;
  pending: number;
  statsStatus: 'idle' | 'loading' | 'ready' | 'error';
}

const initialState: TrackingState = {
  permissions: {
    fineLocation: false,
    backgroundLocation: false,
    notifications: false,
    batteryUnrestricted: false,
  },
  isTracking: false,
  stats: null,
  pending: 0,
  statsStatus: 'idle',
};

export const refreshPermissions = createAsyncThunk('tracking/perms/check', async () =>
  checkPermissions()
);

export const requestPermissions = createAsyncThunk('tracking/perms/request', async () =>
  requestAllPermissions()
);

export const startTracking = createAsyncThunk('tracking/start', async () => {
  await BackgroundTracker.start();
  return true;
});

export const stopTracking = createAsyncThunk('tracking/stop', async () => {
  await BackgroundTracker.stop();
  return false;
});

export const fetchStats = createAsyncThunk('tracking/stats', async () => api.getMyStats());

const trackingSlice = createSlice({
  name: 'tracking',
  initialState,
  reducers: {
    setPending(state, a: PayloadAction<number>) {
      state.pending = a.payload;
    },
    setTracking(state, a: PayloadAction<boolean>) {
      state.isTracking = a.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(refreshPermissions.fulfilled, (s, a) => {
      s.permissions = a.payload;
    });
    b.addCase(requestPermissions.fulfilled, (s, a) => {
      s.permissions = a.payload;
    });
    b.addCase(startTracking.fulfilled, (s) => {
      s.isTracking = true;
    });
    b.addCase(stopTracking.fulfilled, (s) => {
      s.isTracking = false;
    });
    b.addCase(fetchStats.pending, (s) => {
      s.statsStatus = 'loading';
    });
    b.addCase(fetchStats.fulfilled, (s, a) => {
      s.stats = a.payload;
      s.statsStatus = 'ready';
    });
    b.addCase(fetchStats.rejected, (s) => {
      s.statsStatus = 'error';
    });
  },
});

export const { setPending, setTracking } = trackingSlice.actions;
export default trackingSlice.reducer;
