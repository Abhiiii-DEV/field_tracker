import { DailySummary } from '../models';
import { localDateKey } from '../services/analytics.service';
import { logger } from '../config/logger';

/**
 * Runs just after local midnight. Marks the *previous* day's summaries as
 * finalised so reporting can trust them as immutable, and resets the
 * incremental-distance bookkeeping carried on the document.
 *
 * Note: summaries are maintained incrementally on ingest, so this is a
 * lightweight close-out, not a recomputation. A full recompute-from-logs
 * routine lives in seed/maintenance utilities for backfills.
 */
export async function runDailySummaryClose(): Promise<void> {
  const yesterday = localDateKey(new Date(Date.now() - 12 * 60 * 60 * 1000));

  const res = await DailySummary.updateMany(
    { date: yesterday, finalized: false },
    { $set: { finalized: true } }
  );
  logger.info({ date: yesterday, modified: res.modifiedCount }, 'daily summaries finalised');
}
