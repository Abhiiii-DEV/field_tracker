import { env } from '../config/env';
import { logger } from '../config/logger';

type LatLng = { latitude: number; longitude: number };

const ROADS_URL = 'https://roads.googleapis.com/v1/snapToRoads';
// Roads API hard limit: 100 points per request.
const MAX_POINTS = 100;

interface SnapResponse {
  snappedPoints?: { location: { latitude: number; longitude: number } }[];
}

/**
 * Snap raw GPS breadcrumbs onto the road network via the Google Roads API so a
 * drawn polyline follows actual streets instead of cutting across blocks.
 *
 * Requires the Roads API to be enabled for GOOGLE_MAPS_SERVER_KEY and billing
 * on the project, AND the key to NOT be HTTP-referrer-restricted (server calls
 * send no referrer).
 *
 * Returns the snapped points on success, or `null` on any failure (no key, API
 * disabled, key blocked, network/quota error). Callers fall back to the raw
 * route on null — and must NOT cache a null result, so a transient/config
 * failure can't poison a stored route.
 */
export async function snapToRoads(points: LatLng[]): Promise<LatLng[] | null> {
  if (!env.GOOGLE_MAPS_SERVER_KEY || points.length < 2) return null;

  try {
    const snapped: LatLng[] = [];

    // Batch in chunks of 100, overlapping the last point of each batch into the
    // next so consecutive snapped segments join without a visible gap.
    for (let i = 0; i < points.length; i += MAX_POINTS - 1) {
      const chunk = points.slice(i, i + MAX_POINTS);
      if (chunk.length < 2) break;

      const path = chunk.map((p) => `${p.latitude},${p.longitude}`).join('|');
      const url = `${ROADS_URL}?interpolate=true&key=${env.GOOGLE_MAPS_SERVER_KEY}&path=${encodeURIComponent(path)}`;

      const res = await fetch(url);
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        logger.warn({ status: res.status, detail: detail.slice(0, 300) }, 'snapToRoads request failed; using raw route');
        return null;
      }

      const body = (await res.json()) as SnapResponse;
      if (!body.snappedPoints?.length) return null;

      for (const sp of body.snappedPoints) {
        snapped.push({ latitude: sp.location.latitude, longitude: sp.location.longitude });
      }
    }

    return snapped.length >= 2 ? snapped : null;
  } catch (err) {
    logger.warn({ err }, 'snapToRoads error; using raw route');
    return null;
  }
}
