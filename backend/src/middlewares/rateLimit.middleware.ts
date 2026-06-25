import rateLimit from 'express-rate-limit';

/** Tight limiter for auth endpoints to blunt credential-stuffing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try later' } },
});

/**
 * Generous limiter for location ingest — a moving fleet pings often, and
 * offline resync arrives in bursts. Tune per fleet size; for very large fleets
 * move ingest behind a queue (see ARCHITECTURE.md).
 */
export const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
