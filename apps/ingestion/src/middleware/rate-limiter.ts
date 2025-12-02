import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis.js';
import { ApiError } from './error-handler.js';

// 1000 requests per minute per API key
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 1000;

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return next();
    }

    const key = `ratelimit:ingestion:${apiKey}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.pexpire(key, WINDOW_MS);
    }

    const ttl = await redis.pttl(key);

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - current));
    res.setHeader('X-RateLimit-Reset', Date.now() + ttl);

    if (current > MAX_REQUESTS) {
      throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests');
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // If Redis fails, allow the request through
    next();
  }
}
