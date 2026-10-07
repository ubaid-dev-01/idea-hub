import type { Request, RequestHandler } from 'express';
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const max =
  Number(process.env.RATE_LIMIT_MAX) ||
  (process.env.NODE_ENV === 'production' ? 3000 : 20_000);

let globalApiLimiter: RateLimitRequestHandler | null = null;
let strictWriteLimiter: RateLimitRequestHandler | null = null;

function createGlobalLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests — try again later',
      data: null,
      errors: [],
    },
    skip: (req: Request) =>
      req.path === '/' ||
      req.path === '/health' ||
      req.path.startsWith('/health/'),
  });
}

function createStrictWriteLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max: Math.min(max, 600),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many write requests — slow down',
      data: null,
      errors: [],
    },
  });
}

/** Lazy init — avoids module-load failures in serverless bundles. */
export function getGlobalApiLimiter(): RequestHandler {
  if (!globalApiLimiter) {
    try {
      globalApiLimiter = createGlobalLimiter();
    } catch (err) {
      console.error('[api] rate-limit init failed, using noop', err);
      return (_req, _res, next) => next();
    }
  }
  return globalApiLimiter;
}

export function getStrictWriteLimiter(): RequestHandler {
  if (!strictWriteLimiter) {
    try {
      strictWriteLimiter = createStrictWriteLimiter();
    } catch (err) {
      console.error('[api] strict rate-limit init failed, using noop', err);
      return (_req, _res, next) => next();
    }
  }
  return strictWriteLimiter;
}
