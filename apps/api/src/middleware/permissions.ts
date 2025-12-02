import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Permission } from '@mctrack/shared';
import { ApiError } from './error-handler.js';
import { membershipService } from '../services/membership.js';

/**
 * Require a specific permission for the network
 */
export function requirePermission(permission: Permission): RequestHandler {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { networkId } = req.params;
      const { userId } = req;

      if (!networkId) {
        throw new ApiError(400, 'BAD_REQUEST', 'Network ID is required');
      }

      if (!userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const hasPermission = await membershipService.checkPermission(
        userId,
        networkId,
        permission
      );

      if (!hasPermission) {
        throw new ApiError(403, 'FORBIDDEN', 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]): RequestHandler {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { networkId } = req.params;
      const { userId } = req;

      if (!networkId) {
        throw new ApiError(400, 'BAD_REQUEST', 'Network ID is required');
      }

      if (!userId) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
      }

      const memberPermissions = await membershipService.getPermissions(userId, networkId);

      const hasAny = permissions.some((p) => memberPermissions.includes(p));

      if (!hasAny) {
        throw new ApiError(403, 'FORBIDDEN', 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require network membership (any role)
 */
export const requireMembership: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { networkId } = req.params;
    const { userId } = req;

    if (!networkId) {
      throw new ApiError(400, 'BAD_REQUEST', 'Network ID is required');
    }

    if (!userId) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const isMember = await membershipService.isMember(userId, networkId);

    if (!isMember) {
      throw new ApiError(404, 'NETWORK_NOT_FOUND', 'Network not found');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require network ownership
 */
export const requireOwnership: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { networkId } = req.params;
    const { userId } = req;

    if (!networkId) {
      throw new ApiError(400, 'BAD_REQUEST', 'Network ID is required');
    }

    if (!userId) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const isOwner = await membershipService.isOwner(userId, networkId);

    if (!isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'Owner access required');
    }

    next();
  } catch (error) {
    next(error);
  }
};
