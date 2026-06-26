/**
 * Geospatial helpers. All distances are in metres unless stated otherwise.
 */

const EARTH_RADIUS_M = 6_371_000;

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two coordinates using the Haversine formula.
 */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isInsideRadius(point: LatLng, center: LatLng, radiusM: number): boolean {
  return haversineMeters(point, center) <= radiusM;
}

/**
 * Defensive distance accumulation for a single GPS segment. Rejects movement
 * that is really just GPS noise — both stationary scatter (a parked phone whose
 * fixes wander 10-40m in a city) and teleporting fixes — so the daily distance
 * and travel-time totals don't inflate while someone sits still. Returns metres
 * to add (0 if the segment is rejected as noise).
 */
export function plausibleSegmentMeters(
  prev: LatLng,
  next: LatLng,
  elapsedSec: number,
  opts: { maxSpeedKmh?: number; minMoveM?: number; accuracyM?: number; minSpeedKmh?: number } = {}
): number {
  const { maxSpeedKmh = 200, minMoveM = 12, accuracyM = 0, minSpeedKmh = 1 } = opts;
  const d = haversineMeters(prev, next);

  // A real move must clear both the static jitter floor AND the fix's own
  // uncertainty: a reading accurate to only ±30m cannot prove a 20m move.
  const noiseFloor = Math.max(minMoveM, accuracyM);
  if (d < noiseFloor) return 0;

  if (elapsedSec > 0) {
    const speedKmh = (d / elapsedSec) * 3.6;
    if (speedKmh > maxSpeedKmh) return 0; // teleport / bad fix -> drop
    if (speedKmh < minSpeedKmh) return 0; // drift over a long stationary gap -> drop
  }
  return d;
}
