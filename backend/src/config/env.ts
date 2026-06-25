import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

/**
 * Centralised, validated environment configuration.
 * The process refuses to boot if a required variable is missing or malformed,
 * which prevents a half-configured deployment from silently misbehaving.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // CORS - comma separated list of allowed origins for the admin dashboard
  CORS_ORIGINS: z.string().default('*'),

  // Geofence defaults (used only when seeding; runtime value lives in DB)
  DEFAULT_OFFICE_RADIUS_M: z.coerce.number().default(1000),

  // Stop detection tuning
  STOP_RADIUS_M: z.coerce.number().default(30),
  STOP_MIN_DURATION_MIN: z.coerce.number().default(5),

  // Adaptive tracking thresholds (km/h) - shared with mobile via /api/config
  MOVING_SPEED_THRESHOLD_KMH: z.coerce.number().default(3),

  // Retention
  LOCATION_RETENTION_DAYS: z.coerce.number().default(90),

  // Worker cadence (cron expressions)
  CRON_STOP_DETECTION: z.string().default('*/1 * * * *'),
  CRON_DAILY_SUMMARY_CLOSE: z.string().default('5 0 * * *'),
  CRON_STALE_DETECTION: z.string().default('*/2 * * * *'),
  CRON_RETENTION: z.string().default('30 1 * * *'),

  // Mark a user OFFLINE if no ping within this many seconds
  OFFLINE_THRESHOLD_SEC: z.coerce.number().default(180),

  // Google Maps (server-side reverse geocoding only; mobile/web use their own keys)
  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),

  // Firebase Cloud Messaging service account JSON path (optional)
  FCM_SERVICE_ACCOUNT_PATH: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins =
  env.CORS_ORIGINS === '*' ? '*' : env.CORS_ORIGINS.split(',').map((o) => o.trim());

export const isProd = env.NODE_ENV === 'production';
