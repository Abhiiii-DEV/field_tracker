import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.path}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err, path: req.path }, 'AppError');
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Mongoose duplicate key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  if (anyErr?.code === 11000) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Duplicate value', details: anyErr.keyValue },
    });
  }

  logger.error({ err, path: req.path }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: isProd ? 'Internal server error' : String(anyErr?.message ?? err),
    },
  });
}
