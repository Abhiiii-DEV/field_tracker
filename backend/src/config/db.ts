import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB. Retries with backoff so a transient Atlas hiccup
 * during a rolling deploy does not crash the process.
 */
export async function connectDatabase(retries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 50,
        minPoolSize: 5,
      });
      logger.info('MongoDB connected');
      return;
    } catch (err) {
      logger.error(
        { err, attempt },
        `MongoDB connection failed (attempt ${attempt}/${retries})`
      );
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}

export { mongoose };
