import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './error-handler.js';

// Augment Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail?: string;
}

// Type helper for authenticated route handlers
export type AuthHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// Wrapper to make authenticated handlers work with Express router
export function authHandler(handler: AuthHandler): RequestHandler {
  return handler as unknown as RequestHandler;
}

/**
 * Authenticate requests from the Next.js frontend
 *
 * Supports two methods:
 * 1. JWT Bearer token (from client-side requests)
 * 2. X-User-Id header (from Next.js API routes - trusted internal calls)
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Internal calls from Next.js API routes
    const internalUserId = req.headers['x-user-id'] as string;
    const internalSecret = req.headers['x-internal-secret'] as string;

    if (internalUserId && internalSecret === process.env.INTERNAL_API_SECRET) {
      (req as AuthenticatedRequest).userId = internalUserId;
      return next();
    }

    // JWT Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email?: string;
      };

      (req as AuthenticatedRequest).userId = payload.userId;
      (req as AuthenticatedRequest).userEmail = payload.email;
      next();
    } catch {
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if not authenticated
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        email?: string;
      };

      (req as AuthenticatedRequest).userId = payload.userId;
      (req as AuthenticatedRequest).userEmail = payload.email;
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  } catch (error) {
    next(error);
  }
}
