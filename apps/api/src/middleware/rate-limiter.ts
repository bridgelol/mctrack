import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis.js';
import { ApiError } from './error-handler.js';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
};

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Use user ID if authenticated, otherwise IP
    const identifier = (req as any).userId || req.ip || 'unknown';
    const key = `ratelimit:${identifier}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.pexpire(key, defaultConfig.windowMs);
    }

    const ttl = await redis.pttl(key);

    res.setHeader('X-RateLimit-Limit', defaultConfig.maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, defaultConfig.maxRequests - current));
    res.setHeader('X-RateLimit-Reset', Date.now() + ttl);

    if (current > defaultConfig.maxRequests) {
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
