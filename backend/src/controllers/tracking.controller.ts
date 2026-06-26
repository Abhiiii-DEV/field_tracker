import { Request, Response } from 'express';
import { asyncHandler } from '../utils/AppError';
import { ingestPoints } from '../services/location.service';
import { getSelfStats } from '../services/analytics.service';
import { notifyAbout } from '../services/notification.service';
import { getActiveOffice } from '../services/office.service';
import { LiveState, User } from '../models';
import { env } from '../config/env';
import { Types } from 'mongoose';

/** POST /api/track  — single or batched (offline) GPS points. */
export const ingest = asyncHandler(async (req: Request, res: Response) => {
  const summary = await ingestPoints(req.auth!.sub, req.body.points);
  res.json({ ok: true, accepted: req.body.points.length, today: summary });
});

/** GET /api/me/stats — today / week / month, from DailySummary. */
export const myStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getSelfStats(req.auth!.sub);
  const state = await LiveState.findOne({ userId: new Types.ObjectId(req.auth!.sub) }).lean();
  res.json({
    ...stats,
    currentStatus: state?.locationStatus ?? 'UNKNOWN',
    trackingStatus: state?.trackingStatus ?? 'INACTIVE',
  });
});

/** POST /api/track/event — device-side tracking anomalies (GPS off, perms revoked). */
export const trackingEvent = asyncHandler(async (req: Request, res: Response) => {
  const { type, message } = req.body;
  await notifyAbout(req.auth!.sub, type, message ?? defaultMessage(type));
  if (type === 'PERMISSION_REVOKED' || type === 'GPS_DISABLED') {
    await LiveState.updateOne(
      { userId: new Types.ObjectId(req.auth!.sub) },
      { $set: { trackingStatus: 'INACTIVE' } }
    );
  }
  res.json({ ok: true });
});

/** GET /api/config — runtime tuning shared with the mobile client. */
export const getClientConfig = asyncHandler(async (_req: Request, res: Response) => {
  const office = await getActiveOffice();
  res.json({
    office: {
      latitude: office.latitude,
      longitude: office.longitude,
      radius: office.radius,
      name: office.officeName,
    },
    tracking: {
      movingSpeedThresholdKmh: env.MOVING_SPEED_THRESHOLD_KMH,
      movingIntervalSec: env.MOVING_INTERVAL_SEC,
      stationaryIntervalSec: env.STATIONARY_INTERVAL_SEC,
      stopRadiusM: env.STOP_RADIUS_M,
      stopMinDurationMin: env.STOP_MIN_DURATION_MIN,
    },
  });
});

/** POST /api/me/fcm-token — register an admin device for pushes. */
export const registerFcmToken = asyncHandler(async (req: Request, res: Response) => {
  await User.updateOne(
    { _id: new Types.ObjectId(req.auth!.sub) },
    { $addToSet: { fcmTokens: req.body.token } }
  );
  res.json({ ok: true });
});

function defaultMessage(type: string): string {
  switch (type) {
    case 'GPS_DISABLED':
      return 'GPS was disabled on the device';
    case 'PERMISSION_REVOKED':
      return 'Location permission was revoked';
    case 'TRACKING_INTERRUPTED':
      return 'Background tracking was interrupted';
    default:
      return 'Tracking anomaly reported';
  }
}
