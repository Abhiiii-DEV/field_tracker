import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './config/logger';
import { DailySummary, LocationLog } from './models';
import { localDateKey, round2 } from './services/analytics.service';
import { plausibleSegmentMeters } from './utils/geo';

/**
 * Recompute daily summaries from raw LocationLogs.
 *
 * Replays each affected user's stored GPS breadcrumbs through the corrected
 * `plausibleSegmentMeters` filter and rewrites the distance / travel-time /
 * point-count fields of their DailySummary. Raw logs are NOT touched, and the
 * stop, office-transition, and `finalized` fields are preserved.
 *
 * Usage:
 *   npm run recompute            # today (IST)
 *   npm run recompute -- 2026-06-26   # a specific local day
 *   npm run recompute -- all     # every day that has a DailySummary
 */

const MAX_TRAVEL_GAP_SEC = 15 * 60; // mirrors location.service ingest logic
const OFFSET_MIN = 330; // IST (+5:30)

function startOfLocalDay(date: string): Date {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() - OFFSET_MIN * 60_000);
}
function endOfLocalDay(date: string): Date {
  return new Date(new Date(`${date}T23:59:59.999Z`).getTime() - OFFSET_MIN * 60_000);
}

interface Recomputed {
  distanceTravelledKm: number;
  travelMinutes: number;
  totalLocationPoints: number;
  lastLat: number | null;
  lastLng: number | null;
  lastPointAt: Date | null;
}

/** Replay one user's logs for one local day through the corrected filter. */
async function recomputeDay(userId: string, date: string): Promise<Recomputed> {
  const points = await LocationLog.find({
    userId,
    timestamp: { $gte: startOfLocalDay(date), $lte: endOfLocalDay(date) },
  })
    .sort({ timestamp: 1 })
    .select('latitude longitude accuracy timestamp')
    .lean();

  let meters = 0;
  let travelSec = 0;
  let prevLat: number | null = null;
  let prevLng: number | null = null;
  let prevAt: Date | null = null;

  for (const p of points) {
    if (prevLat != null && prevLng != null && prevAt) {
      const elapsedSec = (new Date(p.timestamp).getTime() - prevAt.getTime()) / 1000;
      const seg = plausibleSegmentMeters(
        { latitude: prevLat, longitude: prevLng },
        { latitude: p.latitude, longitude: p.longitude },
        elapsedSec,
        { accuracyM: p.accuracy ?? 0 }
      );
      if (seg > 0) {
        meters += seg;
        if (elapsedSec > 0 && elapsedSec <= MAX_TRAVEL_GAP_SEC) travelSec += elapsedSec;
      }
    }
    prevLat = p.latitude;
    prevLng = p.longitude;
    prevAt = new Date(p.timestamp);
  }

  return {
    distanceTravelledKm: round2(meters / 1000),
    travelMinutes: round2(travelSec / 60),
    totalLocationPoints: points.length,
    lastLat: prevLat,
    lastLng: prevLng,
    lastPointAt: prevAt,
  };
}

async function recompute() {
  await connectDatabase();

  const arg = process.argv[2];
  let summaries;
  if (arg === 'all') {
    summaries = await DailySummary.find().lean();
  } else {
    const date = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg) ? arg : localDateKey();
    summaries = await DailySummary.find({ date }).lean();
  }

  logger.info(`Recomputing ${summaries.length} daily summaries…`);

  let changed = 0;
  for (const s of summaries) {
    const next = await recomputeDay(String(s.userId), s.date);
    const distBefore = round2(s.distanceTravelledKm ?? 0);
    const minBefore = Math.round(s.travelMinutes ?? 0);

    await DailySummary.updateOne(
      { _id: s._id },
      {
        $set: {
          distanceTravelledKm: next.distanceTravelledKm,
          travelMinutes: next.travelMinutes,
          totalLocationPoints: next.totalLocationPoints,
          lastLat: next.lastLat,
          lastLng: next.lastLng,
          lastPointAt: next.lastPointAt,
        },
      }
    );

    const distDelta = round2(next.distanceTravelledKm - distBefore);
    const minDelta = Math.round(next.travelMinutes) - minBefore;
    if (distDelta !== 0 || minDelta !== 0) changed++;

    logger.info(
      `[${s.date}] user ${s.userId}: ` +
        `${distBefore}km/${minBefore}m → ${next.distanceTravelledKm}km/${Math.round(next.travelMinutes)}m ` +
        `(Δ ${distDelta}km, ${minDelta}m)`
    );
  }

  logger.info(`Done. ${changed}/${summaries.length} summaries adjusted.`);
  await disconnectDatabase();
}

recompute().catch((err) => {
  logger.error({ err }, 'recompute failed');
  process.exit(1);
});
