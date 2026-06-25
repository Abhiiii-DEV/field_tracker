export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'salesperson' | 'admin';
  phone?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface QueuedPoint {
  latitude: number;
  longitude: number;
  speed: number; // km/h
  accuracy: number; // metres
  timestamp: string; // ISO
  clientId: string; // idempotency key
  batteryLevel?: number;
}

export interface SelfStats {
  today: {
    distanceTravelledKm: number;
    travelMinutes: number;
    leftOfficeAt: string | null;
    returnedOfficeAt: string | null;
    stopCount: number;
    stopDurationMinutes: number;
  };
  week: { distanceTravelledKm: number; travelMinutes: number };
  month: { distanceTravelledKm: number; travelMinutes: number };
  currentStatus: 'INSIDE_OFFICE' | 'OUTSIDE_OFFICE' | 'UNKNOWN';
  trackingStatus: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
}

export interface ClientConfig {
  office: { latitude: number; longitude: number; radius: number; name: string };
  tracking: {
    movingSpeedThresholdKmh: number;
    movingIntervalSec: number;
    stationaryIntervalSec: number;
    stopRadiusM: number;
    stopMinDurationMin: number;
  };
}
