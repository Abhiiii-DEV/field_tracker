import { storage } from '../utils';
import { getConfig } from '../api';
import type { ClientConfig } from '../types';

const KEY = 'ft_client_config';

const DEFAULTS: ClientConfig = {
  office: { latitude: 23.0384, longitude: 72.512, radius: 1000, name: 'Office' },
  tracking: {
    movingSpeedThresholdKmh: 3,
    movingIntervalSec: 30,
    stationaryIntervalSec: 180,
    stopRadiusM: 30,
    stopMinDurationMin: 5,
  },
};

let cached: ClientConfig | null = null;

/** Returns config, refreshing from the server when possible, else last-known. */
export async function loadConfig(forceRemote = false): Promise<ClientConfig> {
  if (cached && !forceRemote) return cached;
  try {
    const remote = await getConfig();
    cached = remote;
    await storage.set(KEY, remote);
    return remote;
  } catch {
    const stored = await storage.get<ClientConfig>(KEY);
    cached = stored ?? DEFAULTS;
    return cached;
  }
}

export function getCachedConfig(): ClientConfig {
  return cached ?? DEFAULTS;
}
