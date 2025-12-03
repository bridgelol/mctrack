import { Request, Response, NextFunction, RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { db, users } from '@mctrack/db';
import { ApiError } from './error-handler.js';
import { AuthenticatedRequest } from './auth.js';

// Augment Express Request for admin
declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
    }
  }
}

export interface AdminRequest extends AuthenticatedRequest {
  isAdmin: true;
}

// Type helper for admin route handlers
export type AdminHandler = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

// Wrapper to make admin handlers work with Express router
export function adminHandler(handler: AdminHandler): RequestHandler {
  return handler as unknown as RequestHandler;
}

/**
 * Middleware to verify the user is a platform admin
 * Must be used AFTER the authenticate middleware
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;

    if (!userId) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    // Fetch user role from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
    }

    if (user.role !== 'admin') {
      throw new ApiError(403, 'FORBIDDEN', 'Admin access required');
    }

    (req as AdminRequest).isAdmin = true;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional admin check - sets isAdmin flag but doesn't require it
 */
export async function checkAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = req as AuthenticatedRequest;

    if (!userId) {
      req.isAdmin = false;
      return next();
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        role: true,
      },
    });

    req.isAdmin = user?.role === 'admin';
    next();
  } catch (error) {
    req.isAdmin = false;
    next();
  }
}
