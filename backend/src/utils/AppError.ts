import { NextFunction, Request, Response } from 'express';

/**
 * Operational error with an HTTP status. Thrown by services/controllers and
 * translated into a clean JSON envelope by the error middleware.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(msg: string, details?: unknown) {
    return new AppError(400, msg, 'BAD_REQUEST', details);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new AppError(401, msg, 'UNAUTHORIZED');
  }
  static forbidden(msg = 'Forbidden') {
    return new AppError(403, msg, 'FORBIDDEN');
  }
  static notFound(msg = 'Not found') {
    return new AppError(404, msg, 'NOT_FOUND');
  }
  static conflict(msg: string) {
    return new AppError(409, msg, 'CONFLICT');
  }
}

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route so rejected promises hit the error middleware. */
export const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
