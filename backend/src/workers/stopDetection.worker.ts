import { Types } from 'mongoose';
import { LiveState, LocationLog, Stop, DailySummary } from '../models';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { haversineMeters } from '../utils/geo';
import { localDateKey } from '../services/analytics.service';
import { emitStopNew, emitSummaryUpdate } from '../realtime/socket';

/**
 * Stop / halt detection.
 *
 * Definition (from spec): the employee stays within STOP_RADIUS_M for at least
 * STOP_MIN_DURATION_MIN → a Stop is recorded.
 *
 * Strategy: incremental, per active employee. We read points from a per-user
 * cursor, cluster consecutive points that stay within the radius of the cluster
 * anchor, and finalise a cluster only once a *later* point breaks out of it
 * (so an ongoing halt isn't closed early). The cursor advances to the start of
 * the last still-open cluster. A unique (userId,startTime,endTime) index makes
 * re-runs idempotent.
 */
export async function runStopDetection(): Promise<void> {
  const states = await LiveState.find({ trackingStatus: 'ACTIVE' })
    .select('userId stopCursorAt')
    .lean();

  for (const s of states) {
    try {
      await detectForUser(String(s.userId), s.stopCursorAt ?? null);
    } catch (err) {
      logger.warn({ err, userId: String(s.userId) }, 'stop detection failed for user');
    }
  }
}

async function detectForUser(userId: string, cursor: Date | null): Promise<void> {
  const since = cursor ?? new Date(Date.now() - 6 * 60 * 60 * 1000); // bootstrap: last 6h
  const points = await LocationLog.find({
    userId: new Types.ObjectId(userId),
    timestamp: { $gte: since },
  })
    .sort({ timestamp: 1 })
    .select('latitude longitude timestamp')
    .lean();

  if (points.length < 2) return;

  const radius = env.STOP_RADIUS_M;
  const minMs = env.STOP_MIN_DURATION_MIN * 60 * 1000;

  let anchor = points[0];
  let clusterStartIdx = 0;
  let newCursor: Date | null = null;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const within =
      haversineMeters(
        { latitude: anchor.latitude, longitude: anchor.longitude },
        { latitude: p.latitude, longitude: p.longitude }
      ) <= radius;

    if (!within) {
      // Cluster [clusterStartIdx .. i-1] is now closed by point i.
      const start = points[clusterStartIdx];
      const end = points[i - 1];
      const durationMs = new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime();
      if (durationMs >= minMs) {
        await persistStop(userId, start, end, durationMs);
      }
      // Start a new cluster at the breaking point.
      anchor = p;
      clusterStartIdx = i;
    }
  }

  // The trailing cluster is still "open" — leave the cursor at its start so the
  // next run can extend or finalise it.
  newCursor = new Date(points[clusterStartIdx].timestamp);

  await LiveState.updateOne(
    { userId: new Types.ObjectId(userId) },
    { $set: { stopCursorAt: newCursor } }
  );
}

async function persistStop(
  userId: string,
  start: { latitude: number; longitude: number; timestamp: Date },
  end: { latitude: number; longitude: number; timestamp: Date },
  durationMs: number
): Promise<void> {
  const durationMinutes = Math.round(durationMs / 60000);
  const date = localDateKey(new Date(start.timestamp));

  try {
    const stop = await Stop.create({
      userId: new Types.ObjectId(userId),
      latitude: start.latitude,
      longitude: start.longitude,
      startTime: start.timestamp,
      endTime: end.timestamp,
      durationMinutes,
      date,
    });

    // Roll the stop into the daily summary (precomputed analytics).
    const summary = await DailySummary.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), date },
      {
        $inc: { stopCount: 1, stopDurationMinutes: durationMinutes },
        $setOnInsert: { userId: new Types.ObjectId(userId), date },
      },
      { new: true, upsert: true }
    );

    emitStopNew(userId, stop.toObject());
    if (summary) emitSummaryUpdate(userId, { date, stopCount: summary.stopCount });
    logger.debug({ userId, durationMinutes }, 'stop recorded');
  } catch (err) {
    // Duplicate (userId,startTime,endTime) → already recorded, ignore.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((err as any)?.code !== 11000) throw err;
  }
}
