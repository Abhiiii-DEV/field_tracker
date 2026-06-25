import http from 'http';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/db';
import { createApp } from './app';
import { initSocket } from './realtime/socket';
import { startWorkers, stopWorkers } from './workers';

async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  // Realtime gateway shares the HTTP server.
  initSocket(server);

  // Background processing.
  startWorkers();

  server.listen(env.PORT, () => {
    logger.info(`HTTP + WebSocket server listening on :${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown so in-flight requests/sockets drain on deploy.
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down');
    stopWorkers();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Hard cap.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'fatal during bootstrap');
  process.exit(1);
});
