import { Model } from 'mongoose';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './config/logger';
import {
  LocationLog,
  DailySummary,
  Stop,
  Notification,
  Session,
  LiveState,
} from './models';

/**
 * Clean-slate reset of all TRACKING data, for a fresh demo/start.
 *
 * Wipes raw GPS logs, daily summaries, stops, notifications, login sessions and
 * live state — so distance, travel time, timelines, stops and map markers all
 * go back to zero.
 *
 * PRESERVES: User accounts, the Office geofence, and refresh tokens (so no one
 * is logged out). Nothing about the users themselves is touched.
 *
 * Destructive and irreversible — requires explicit confirmation:
 *   npm run reset-tracking -- --yes
 */
async function resetTracking() {
  if (!process.argv.includes('--yes')) {
    logger.error(
      'Refusing to run without confirmation. This permanently deletes all GPS logs, ' +
        'summaries, stops, notifications and sessions. Re-run with:  npm run reset-tracking -- --yes'
    );
    process.exit(1);
  }

  await connectDatabase();

  // Collections that hold per-user tracking data. Users / Office / RefreshToken
  // are intentionally NOT in this list.
  const targets: { name: string; model: Model<any> }[] = [
    { name: 'LocationLog (raw GPS)', model: LocationLog as Model<any> },
    { name: 'DailySummary (distance/travel)', model: DailySummary as Model<any> },
    { name: 'Stop', model: Stop as Model<any> },
    { name: 'Notification (alerts/timeline)', model: Notification as Model<any> },
    { name: 'Session (login history)', model: Session as Model<any> },
    { name: 'LiveState (map markers/status)', model: LiveState as Model<any> },
  ];

  logger.info('Resetting tracking data (users, office and auth are preserved)…');
  for (const t of targets) {
    const res = await t.model.deleteMany({});
    logger.info(`  cleared ${t.name}: ${res.deletedCount} docs`);
  }
  logger.info('Done. All tracking metrics are back to zero.');

  await disconnectDatabase();
}

resetTracking().catch((err) => {
  logger.error({ err }, 'reset-tracking failed');
  process.exit(1);
});
