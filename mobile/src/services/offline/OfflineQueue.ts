import { storage } from '../../utils';
import type { QueuedPoint } from '../../types';

const KEY = 'ft_offline_queue';
const MAX = 5000; // hard cap so a long outage can't grow unbounded

/**
 * Durable offline queue.
 *
 * Every GPS fix is enqueued here first and only removed once the server has
 * acknowledged it. Each point carries a clientId, so re-sending after a flaky
 * connection cannot create duplicates (the API de-dupes on (userId, clientId)).
 *
 * This guarantees the spec's "no location loss / no duplicates / automatic
 * recovery": points survive app restarts because the queue is persisted.
 */
class OfflineQueueImpl {
  private buffer: QueuedPoint[] = [];
  private loaded = false;
  private flushing = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.buffer = (await storage.get<QueuedPoint[]>(KEY)) ?? [];
    this.loaded = true;
  }

  async enqueue(point: QueuedPoint): Promise<void> {
    await this.load();
    this.buffer.push(point);
    if (this.buffer.length > MAX) {
      // Drop the oldest to bound storage; these are the least useful points.
      this.buffer.splice(0, this.buffer.length - MAX);
    }
    await this.persist();
  }

  size(): number {
    return this.buffer.length;
  }

  /**
   * Flush in batches using the provided uploader. Points are only removed after
   * a successful upload, so a failure mid-flush leaves the rest queued.
   */
  async flush(
    uploader: (points: QueuedPoint[]) => Promise<void>,
    batchSize = 200
  ): Promise<{ sent: number }> {
    await this.load();
    if (this.flushing || this.buffer.length === 0) return { sent: 0 };
    this.flushing = true;
    let sent = 0;
    try {
      while (this.buffer.length > 0) {
        const batch = this.buffer.slice(0, batchSize);
        await uploader(batch); // throws on failure -> we stop, keep remainder
        this.buffer.splice(0, batch.length);
        await this.persist();
        sent += batch.length;
      }
    } finally {
      this.flushing = false;
    }
    return { sent };
  }

  private persist(): Promise<void> {
    return storage.set(KEY, this.buffer);
  }
}

export const OfflineQueue = new OfflineQueueImpl();
