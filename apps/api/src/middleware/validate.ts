import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from './error-handler.js';

// Extend Express Request to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedParams?: unknown;
    }
  }
}

/**
 * Validate request body against a Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body', {
          errors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate query parameters against a Zod schema
 * The parsed result is stored in req.validatedQuery to avoid Express readonly errors
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      req.validatedQuery = parsed;
      // Also update each key individually for backwards compatibility
      Object.keys(parsed as object).forEach(key => {
        (req.query as Record<string, unknown>)[key] = (parsed as Record<string, unknown>)[key];
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid query parameters', {
          errors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validate URL parameters against a Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.params);
      req.validatedParams = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid URL parameters', {
          errors: error.errors,
        }));
      } else {
        next(error);
      }
    }
  };
}
