import { Request, Response, NextFunction } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { db, apiKeys } from '@mctrack/db';
import { hashApiKey } from '@mctrack/shared';
import { redis } from '../lib/redis.js';
import { ApiError } from './error-handler.js';

export interface AuthenticatedRequest extends Request {
  networkId: string;
  gamemodeId: string | null;
  apiKeyId: string;
}

const CACHE_TTL = 300; // 5 minutes

/**
 * Authenticate requests using API key
 */
export async function apiKeyAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new ApiError(401, 'MISSING_API_KEY', 'API key required');
    }

    if (!apiKey.startsWith('mct_')) {
      throw new ApiError(401, 'INVALID_API_KEY', 'Invalid API key format');
    }

    const keyHash = hashApiKey(apiKey);

    // Check cache first
    const cacheKey = `apikey:${keyHash}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      if (data.revoked) {
        throw new ApiError(401, 'API_KEY_REVOKED', 'API key has been revoked');
      }
      (req as AuthenticatedRequest).networkId = data.networkId;
      (req as AuthenticatedRequest).gamemodeId = data.gamemodeId;
      (req as AuthenticatedRequest).apiKeyId = data.id;
      return next();
    }

    // Look up in database
    const key = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt)
      ),
      columns: {
        id: true,
        networkId: true,
        gamemodeId: true,
        revokedAt: true,
      },
    });

    if (!key) {
      // Cache negative result briefly
      await redis.setex(cacheKey, 60, JSON.stringify({ revoked: true }));
      throw new ApiError(401, 'INVALID_API_KEY', 'Invalid API key');
    }

    // Cache the result
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify({
      id: key.id,
      networkId: key.networkId,
      gamemodeId: key.gamemodeId,
      revoked: false,
    }));

    // Update last used (async, don't wait)
    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, key.id))
      .catch(() => {}); // Ignore errors

    (req as AuthenticatedRequest).networkId = key.networkId;
    (req as AuthenticatedRequest).gamemodeId = key.gamemodeId;
    (req as AuthenticatedRequest).apiKeyId = key.id;

    next();
  } catch (error) {
    next(error);
  }
}
