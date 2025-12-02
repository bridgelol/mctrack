import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger.js';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error but keep response minimal for performance
  logger.error({ err: err.message }, 'Request error');

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.code,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
    });
    return;
  }

  // Minimal error response for ingestion service
  res.status(500).json({
    error: 'INTERNAL_ERROR',
  });
}
