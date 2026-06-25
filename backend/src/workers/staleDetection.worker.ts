import { LiveState, User } from '../models';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { createNotification } from '../services/notification.service';
import { emitEmployeeStatus } from '../realtime/socket';

/**
 * Marks employees OFFLINE when no GPS ping has arrived within the threshold,
 * and raises a single OFFLINE notification per offline episode (the
 * offlineNotified flag prevents repeat alerts; it is reset on the next ingest).
 */
export async function runStaleDetection(): Promise<void> {
  const cutoff = new Date(Date.now() - env.OFFLINE_THRESHOLD_SEC * 1000);

  const stale = await LiveState.find({
    isOnline: true,
    trackingStatus: 'ACTIVE',
    lastSeenAt: { $lt: cutoff },
  }).lean();

  for (const s of stale) {
    await LiveState.updateOne(
      { _id: s._id },
      { $set: { isOnline: false, offlineNotified: true } }
    );
    emitEmployeeStatus(String(s.userId), { userId: String(s.userId), isOnline: false });

    if (!s.offlineNotified) {
      const user = await User.findById(s.userId).select('name').lean();
      await createNotification({
        userId: String(s.userId),
        userName: user?.name ?? 'Employee',
        type: 'OFFLINE',
        message: `appears offline — no location update for over ${Math.round(
          env.OFFLINE_THRESHOLD_SEC / 60
        )} min`,
      });
      logger.debug({ userId: String(s.userId) }, 'employee marked offline');
    }
  }
}
