import { Types } from 'mongoose';
import {
  LocationLog,
  LiveState,
  DailySummary,
} from '../models';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getActiveOffice } from './office.service';
import { ensureDailySummary, localDateKey, round2 } from './analytics.service';
import { notifyAbout } from './notification.service';
import {
  emitLocationUpdate,
  emitEmployeeStatus,
  emitSummaryUpdate,
} from '../realtime/socket';
import { haversineMeters, isInsideRadius, plausibleSegmentMeters } from '../utils/geo';

export interface IncomingPoint {
  latitude: number;
  longitude: number;
  speed?: number; // km/h reported by device
  accuracy?: number;
  timestamp: string | number | Date;
  clientId?: string; // device-generated idempotency key
  batteryLevel?: number;
}

const MAX_TRAVEL_GAP_SEC = 15 * 60; // don't count travel time across a >15min gap

/**
 * Ingest one or many GPS points for a user. Safe for both the live single-point
 * path and the offline batch-resync path (points may arrive out of order and
 * with duplicates). Returns the refreshed today-summary for the salesperson app.
 */
export async function ingestPoints(userId: string, rawPoints: IncomingPoint[]) {
  if (!rawPoints.length) return null;

  // 1) Normalise + sort chronologically (offline batches can be unordered).
  const points = rawPoints
    .map((p) => ({
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      speed: Number(p.speed ?? 0),
      accuracy: Number(p.accuracy ?? 0),
      timestamp: new Date(p.timestamp),
      clientId: p.clientId,
      batteryLevel: p.batteryLevel,
    }))
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (!points.length) return null;

  // 2) De-duplicate against already-stored clientIds (offline resync safety).
  const clientIds = points.map((p) => p.clientId).filter(Boolean) as string[];
  let existing = new Set<string>();
  if (clientIds.length) {
    const found = await LocationLog.find({
      userId: new Types.ObjectId(userId),
      clientId: { $in: clientIds },
    })
      .select('clientId')
      .lean();
    existing = new Set(found.map((f) => f.clientId as string));
  }
  const fresh = points.filter((p) => !p.clientId || !existing.has(p.clientId));
  if (!fresh.length) {
    return getTodaySummaryLean(userId);
  }

  // 3) Append raw logs (ordered:false so any residual dup-key is skipped, not fatal).
  try {
    await LocationLog.insertMany(
      fresh.map((p) => ({ userId: new Types.ObjectId(userId), ...p })),
      { ordered: false }
    );
  } catch (err) {
    // Duplicate-key on (userId, clientId) is expected under racing resyncs.
    logger.debug({ err }, 'insertMany partial (dups skipped)');
  }

  // 4) Incrementally fold the points into analytics + live state + geofence.
  const office = await getActiveOffice();
  const live = await LiveState.findOneAndUpdate(
    { userId: new Types.ObjectId(userId) },
    { $setOnInsert: { userId: new Types.ObjectId(userId) } },
    { new: true, upsert: true }
  );

  // Group points by local day so a batch spanning midnight updates both days.
  const byDay = new Map<string, typeof fresh>();
  for (const p of fresh) {
    const key = localDateKey(p.timestamp);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(p);
  }

  let lastSummaryDate = '';
  for (const [date, dayPoints] of byDay) {
    const summary = await ensureDailySummary(userId, date);

    let addedMeters = 0;
    let addedTravelSec = 0;
    let prevLat = summary.lastLat;
    let prevLng = summary.lastLng;
    let prevAt = summary.lastPointAt;

    for (const p of dayPoints) {
      if (prevLat != null && prevLng != null && prevAt) {
        const elapsedSec = (p.timestamp.getTime() - prevAt.getTime()) / 1000;
        const seg = plausibleSegmentMeters(
          { latitude: prevLat, longitude: prevLng },
          { latitude: p.latitude, longitude: p.longitude },
          elapsedSec
        );
        if (seg > 0) {
          addedMeters += seg;
          if (elapsedSec > 0 && elapsedSec <= MAX_TRAVEL_GAP_SEC) {
            addedTravelSec += elapsedSec;
          }
        }
      }
      prevLat = p.latitude;
      prevLng = p.longitude;
      prevAt = p.timestamp;
    }

    summary.distanceTravelledKm = round2(summary.distanceTravelledKm + addedMeters / 1000);
    summary.travelMinutes = round2(summary.travelMinutes + addedTravelSec / 60);
    summary.totalLocationPoints += dayPoints.length;
    summary.lastLat = prevLat;
    summary.lastLng = prevLng;
    summary.lastPointAt = prevAt;
    await summary.save();
    lastSummaryDate = date;
    emitSummaryUpdate(userId, summaryToDto(summary));
  }

  // 5) Geofence + live-state from the final (most recent) point.
  const last = fresh[fresh.length - 1];
  const inside = isInsideRadius(
    { latitude: last.latitude, longitude: last.longitude },
    { latitude: office.latitude, longitude: office.longitude },
    office.radius
  );
  const newLocationStatus = inside ? 'INSIDE_OFFICE' : 'OUTSIDE_OFFICE';
  const prevLocationStatus = live.locationStatus;

  // Moving heuristic: device speed over threshold OR a real segment occurred.
  const movingByDistance =
    live.latitude != null &&
    live.longitude != null &&
    haversineMeters(
      { latitude: live.latitude, longitude: live.longitude },
      { latitude: last.latitude, longitude: last.longitude }
    ) >= 8;
  const isMoving = last.speed >= env.MOVING_SPEED_THRESHOLD_KMH || movingByDistance;

  live.latitude = last.latitude;
  live.longitude = last.longitude;
  live.speed = round2(last.speed);
  live.isMoving = isMoving;
  live.locationStatus = newLocationStatus;
  live.isOnline = true;
  live.offlineNotified = false;
  live.trackingStatus = 'ACTIVE';
  live.lastSeenAt = new Date();
  if (last.batteryLevel != null) live.batteryLevel = last.batteryLevel;
  await live.save();

  // 6) Geofence transition → event + admin notification.
  if (prevLocationStatus !== 'UNKNOWN' && prevLocationStatus !== newLocationStatus) {
    await handleGeofenceTransition(userId, prevLocationStatus, newLocationStatus, last.timestamp);
  }

  // 7) Realtime live position to admins.
  emitLocationUpdate(userId, {
    userId,
    latitude: last.latitude,
    longitude: last.longitude,
    speed: live.speed,
    isMoving,
    locationStatus: newLocationStatus,
    trackingStatus: live.trackingStatus,
    timestamp: last.timestamp,
  });

  return getTodaySummaryLean(userId, lastSummaryDate);
}

async function handleGeofenceTransition(
  userId: string,
  from: string,
  to: string,
  at: Date
) {
  const date = localDateKey(at);
  const summary = await ensureDailySummary(userId, date);

  if (to === 'OUTSIDE_OFFICE') {
    // First exit of the day sets leftOfficeAt.
    if (!summary.leftOfficeAt) {
      summary.leftOfficeAt = at;
      await summary.save();
    }
    await notifyAbout(userId, 'LEFT_OFFICE', `left the office area at ${fmt(at)}`, {
      at,
    });
  } else if (to === 'INSIDE_OFFICE') {
    // Latest return of the day.
    summary.returnedOfficeAt = at;
    await summary.save();
    await notifyAbout(userId, 'RETURNED_OFFICE', `returned to the office area at ${fmt(at)}`, {
      at,
    });
  }
  emitEmployeeStatus(userId, { userId, locationStatus: to, from });
}

function fmt(d: Date): string {
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

async function getTodaySummaryLean(userId: string, date = localDateKey()) {
  const doc = await ensureDailySummary(userId, date);
  return summaryToDto(doc);
}

function summaryToDto(doc: {
  date: string;
  distanceTravelledKm: number;
  travelMinutes: number;
  stopCount: number;
  stopDurationMinutes: number;
  leftOfficeAt?: Date | null;
  returnedOfficeAt?: Date | null;
  totalLocationPoints: number;
}) {
  return {
    date: doc.date,
    distanceTravelledKm: round2(doc.distanceTravelledKm),
    travelMinutes: Math.round(doc.travelMinutes),
    stopCount: doc.stopCount,
    stopDurationMinutes: Math.round(doc.stopDurationMinutes),
    leftOfficeAt: doc.leftOfficeAt ?? null,
    returnedOfficeAt: doc.returnedOfficeAt ?? null,
    totalLocationPoints: doc.totalLocationPoints,
  };
}

export { summaryToDto };
