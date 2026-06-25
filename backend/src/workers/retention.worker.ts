import { LocationLog } from '../models';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Retention.
 *
 * The heavy lifting is done declaratively by the TTL index on
 * LocationLog.timestamp (expireAfterSeconds = LOCATION_RETENTION_DAYS), so
 * MongoDB expires raw points automatically. DailySummary is retained forever.
 *
 * This worker exists as the seam for COLD-STORAGE ARCHIVAL: before points age
 * out you can stream them to S3/Azure Blob/Parquet here. By default it only
 * reports the volume nearing expiry so retention is observable.
 */
export async function runRetention(): Promise<void> {
  const horizon = new Date(Date.now() - env.LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expiringSoon = await LocationLog.countDocuments({
    timestamp: { $lt: new Date(horizon.getTime() + 24 * 60 * 60 * 1000) },
  });
  logger.info(
    { retentionDays: env.LOCATION_RETENTION_DAYS, expiringWithin24h: expiringSoon },
    'retention check (TTL index handles deletion automatically)'
  );

  // TODO (scale): archive `expiringSoon` documents to cold storage before TTL
  // removes them. e.g. stream LocationLog.find({ timestamp: { $lt: horizon } })
  // to Parquet on object storage, then let the TTL index reclaim space.
}
