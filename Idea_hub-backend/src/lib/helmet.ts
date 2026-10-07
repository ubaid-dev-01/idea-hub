import { createRequire } from 'node:module';

import type { RequestHandler } from 'express';

const require = createRequire(import.meta.url);

const fallbackHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
};

let cached: RequestHandler | null = null;

function loadHelmetFactory(): ((options?: object) => RequestHandler) | null {
  let mod: unknown;
  try {
    mod = require('helmet');
  } catch {
    return null;
  }

  if (typeof mod === 'function') {
    return mod as (options?: object) => RequestHandler;
  }

  if (typeof mod === 'object' && mod !== null && 'default' in mod) {
    const inner = (mod as { default: unknown }).default;
    if (typeof inner === 'function') {
      return inner as (options?: object) => RequestHandler;
    }
  }

  return null;
}

/** Lazy — never throws at import time (Vercel bundles helmet differently than local tsc). */
export function getSecurityHeaders(): RequestHandler {
  if (cached) return cached;

  const factory = loadHelmetFactory();
  if (!factory) {
    cached = fallbackHeaders;
    return cached;
  }

  try {
    cached = factory({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }) as RequestHandler;
  } catch {
    cached = fallbackHeaders;
  }

  return cached;
}
