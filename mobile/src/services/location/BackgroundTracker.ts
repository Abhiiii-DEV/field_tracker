import BackgroundService from 'react-native-background-actions';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { getCurrentFix, Fix } from './geolocation';
import { OfflineQueue } from '../offline/OfflineQueue';
import { loadConfig, getCachedConfig } from '../config';
import { uploadPoints, reportTrackingEvent } from '../../api';
import { haversineMeters, uuid } from '../../utils';
import type { QueuedPoint } from '../../types';

/**
 * Adaptive GPS tracking engine.
 *
 * Runs inside an Android foreground service (and iOS background location mode)
 * so it survives app-minimise / screen-lock and stops ONLY on logout.
 *
 * Adaptive cadence (battery + data + server-load friendly):
 *   - moving      → sample every `movingIntervalSec` (default 30s)
 *   - stationary  → sample every `stationaryIntervalSec` (default 2–5 min)
 * "Moving" = reported speed over threshold OR meaningful displacement from the
 * previous fix.
 *
 * Every fix is written to the durable OfflineQueue first, then we attempt to
 * flush the queue whenever connectivity is available — giving no-loss,
 * no-duplicate offline sync for free.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let lastFix: Fix | null = null;
let consecutiveErrors = 0;

async function isConnected(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return !!s.isConnected && s.isInternetReachable !== false;
}

async function batteryPercent(): Promise<number | undefined> {
  try {
    const level = await DeviceInfo.getBatteryLevel(); // 0..1, -1 if unknown
    return level >= 0 ? Math.round(level * 100) : undefined;
  } catch {
    return undefined;
  }
}

async function captureOnce(): Promise<number> {
  const config = getCachedConfig();
  const { movingSpeedThresholdKmh, movingIntervalSec, stationaryIntervalSec } =
    config.tracking;

  let fix: Fix;
  try {
    fix = await getCurrentFix();
    consecutiveErrors = 0;
  } catch {
    consecutiveErrors += 1;
    // After repeated failures, tell the backend tracking is interrupted.
    if (consecutiveErrors === 3) {
      void reportTrackingEvent('TRACKING_INTERRUPTED', 'Repeated GPS read failures').catch(
        () => {}
      );
    }
    return stationaryIntervalSec * 1000; // back off
  }

  // Decide moving vs stationary.
  const displaced =
    lastFix != null &&
    haversineMeters(
      { latitude: lastFix.latitude, longitude: lastFix.longitude },
      { latitude: fix.latitude, longitude: fix.longitude }
    ) >= 12;
  const isMoving = fix.speedKmh >= movingSpeedThresholdKmh || displaced;
  lastFix = fix;

  // Enqueue (durable). clientId makes the upload idempotent.
  const point: QueuedPoint = {
    latitude: fix.latitude,
    longitude: fix.longitude,
    speed: Math.round(fix.speedKmh * 10) / 10,
    accuracy: Math.round(fix.accuracy),
    timestamp: new Date(fix.timestamp).toISOString(),
    clientId: uuid(),
    batteryLevel: await batteryPercent(),
  };
  await OfflineQueue.enqueue(point);

  // Try to drain the queue if we're online.
  if (await isConnected()) {
    try {
      await OfflineQueue.flush((batch) => uploadPoints(batch));
    } catch {
      // Stay queued; next cycle retries. No data loss.
    }
  }

  return (isMoving ? movingIntervalSec : stationaryIntervalSec) * 1000;
}

// The long-running task body. BackgroundService keeps this alive.
const trackingTask = async () => {
  await OfflineQueue.load();
  await loadConfig(true).catch(() => {});

  // eslint-disable-next-line no-constant-condition
  while (BackgroundService.isRunning()) {
    const nextDelayMs = await captureOnce();
    await sleep(nextDelayMs);
  }
};

const options = {
  taskName: 'FieldTracking',
  taskTitle: 'Tracking active',
  taskDesc: 'Sharing your location with your team',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#F4A340',
  linkingURI: 'fieldtracking://dashboard',
  // foregroundServiceType is declared in AndroidManifest (location).
};

export const BackgroundTracker = {
  async start(): Promise<void> {
    if (BackgroundService.isRunning()) return;
    lastFix = null;
    consecutiveErrors = 0;
    await BackgroundService.start(trackingTask, options);
  },
  async stop(): Promise<void> {
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }
    lastFix = null;
  },
  isRunning(): boolean {
    return BackgroundService.isRunning();
  },
  /** Flush any queued points immediately (e.g. on regaining connectivity). */
  async syncNow(): Promise<void> {
    if (await isConnected()) {
      await OfflineQueue.flush((batch) => uploadPoints(batch)).catch(() => {});
    }
  },
  pendingCount(): number {
    return OfflineQueue.size();
  },
};
