export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'salesperson';
  phone?: string | null;
}

export interface ManagedUser {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'salesperson';
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Overview {
  totalEmployees: number;
  activeEmployees: number;
  onlineEmployees: number;
  offlineEmployees: number;
  insideOffice: number;
  outsideOffice: number;
  moving: number;
  stopped: number;
}

export type LocationStatus = 'INSIDE_OFFICE' | 'OUTSIDE_OFFICE' | 'UNKNOWN';
export type TrackingStatus = 'ACTIVE' | 'INACTIVE' | 'OFFLINE';

export interface EmployeeCard {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  trackingStatus: TrackingStatus;
  isOnline: boolean;
  currentSpeed: number;
  locationStatus: LocationStatus;
  currentLocation: { latitude: number; longitude: number } | null;
  lastSeenAt: string | null;
  distanceTravelledKm: number;
  batteryLevel: number | null;
}

export interface Stop {
  _id: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  resolvedAddress?: string;
}

export interface EmployeeDetail {
  user: User;
  live: {
    currentLocation: { latitude: number; longitude: number } | null;
    currentSpeed: number;
    isMoving: boolean;
    locationStatus: LocationStatus;
    trackingStatus: TrackingStatus;
    isOnline: boolean;
    lastSeenAt: string | null;
    batteryLevel: number | null;
  };
  today: {
    date: string;
    distanceTravelledKm: number;
    travelMinutes: number;
    leftOfficeAt: string | null;
    returnedOfficeAt: string | null;
    stopCount: number;
    stopDurationMinutes: number;
    totalLocationPoints: number;
  };
  stops: Stop[];
}

export interface EmployeeMap {
  office: { name: string; latitude: number; longitude: number; radius: number };
  current: { latitude: number; longitude: number; speed: number } | null;
  route: { latitude: number; longitude: number; timestamp: string }[];
  /** Road-snapped version of `route` for drawing the polyline (falls back to `route`). */
  routePolyline?: { latitude: number; longitude: number }[];
  stops: Stop[];
}

export interface TimelineEvent {
  type: string;
  at: string;
  label: string;
  meta?: Record<string, unknown>;
}

export interface AppNotification {
  _id: string;
  userId: string;
  userName: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  speed: number;
  isMoving: boolean;
  locationStatus: LocationStatus;
  trackingStatus: TrackingStatus;
  timestamp: string;
}
