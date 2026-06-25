import Geolocation, {
  GeoPosition,
  GeoError,
} from 'react-native-geolocation-service';

export interface Fix {
  latitude: number;
  longitude: number;
  speedKmh: number;
  accuracy: number;
  timestamp: number;
}

function toFix(pos: GeoPosition): Fix {
  // react-native-geolocation-service reports speed in m/s (or -1 if unknown).
  const mps = pos.coords.speed ?? 0;
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    speedKmh: mps > 0 ? mps * 3.6 : 0,
    accuracy: pos.coords.accuracy ?? 0,
    timestamp: pos.timestamp,
  };
}

/** Single high-accuracy fix. Rejects on error so the caller can decide. */
export function getCurrentFix(timeoutMs = 15000): Promise<Fix> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve(toFix(pos)),
      (err: GeoError) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 5000,
        // Android: keep using GPS even with a foreground service running.
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  });
}
