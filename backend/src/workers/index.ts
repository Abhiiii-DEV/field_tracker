import cron, { ScheduledTask } from 'node-cron';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { runStopDetection } from './stopDetection.worker';
import { runStaleDetection } from './staleDetection.worker';
import { runDailySummaryClose } from './dailySummaryClose.worker';
import { runRetention } from './retention.worker';

const tasks: ScheduledTask[] = [];

/**
 * In-process scheduler. Each job is wrapped so an overrun cannot overlap with
 * its next tick, and failures are logged rather than crashing the process.
 *
 * SCALE PATH: these run in-process today. For a large fleet, move ingest and
 * stop-detection onto a queue (BullMQ/Redis) and run this scheduler as a
 * dedicated worker dyno — the job functions are already pure and importable.
 */
function guarded(name: string, fn: () => Promise<void>) {
  let running = false;
  return async () => {
    if (running) {
      logger.warn({ job: name }, 'skipping run — previous still in progress');
      return;
    }
    running = true;
    const start = Date.now();
    try {
      await fn();
    } catch (err) {
      logger.error({ err, job: name }, 'worker job failed');
    } finally {
      running = false;
      logger.debug({ job: name, ms: Date.now() - start }, 'worker job complete');
    }
  };
}

export function startWorkers(): void {
  const jobs: Array<[string, string, () => Promise<void>]> = [
    ['stop-detection', env.CRON_STOP_DETECTION, runStopDetection],
    ['stale-detection', env.CRON_STALE_DETECTION, runStaleDetection],
    ['daily-summary-close', env.CRON_DAILY_SUMMARY_CLOSE, runDailySummaryClose],
    ['retention', env.CRON_RETENTION, runRetention],
  ];

  for (const [name, expr, fn] of jobs) {
    if (!cron.validate(expr)) {
      logger.error({ name, expr }, 'invalid cron expression — job not scheduled');
      continue;
    }
    tasks.push(cron.schedule(expr, guarded(name, fn)));
    logger.info({ name, expr }, 'worker scheduled');
  }
}

export function stopWorkers(): void {
  for (const t of tasks) t.stop();
  tasks.length = 0;
}
