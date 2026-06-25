import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import { corsOrigins } from './config/env';
import { logger } from './config/logger';
import routes from './routes';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1); // behind a load balancer / reverse proxy
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Liveness/readiness for load balancers and orchestrators.
  app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState; // 1 = connected
    res.status(dbState === 1 ? 200 : 503).json({
      status: dbState === 1 ? 'ok' : 'degraded',
      db: dbState === 1 ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api', apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
