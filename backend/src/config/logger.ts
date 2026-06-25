import pino from 'pino';
import { env, isProd } from './env';

/**
 * Structured JSON logging in production (so it ships cleanly into
 * CloudWatch / Azure Monitor / Loki), pretty-printed locally.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino/file', // avoid pino-pretty hard dependency; keep JSON in dev too
          options: { destination: 1 },
        },
      }),
  base: { service: 'field-tracking-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
