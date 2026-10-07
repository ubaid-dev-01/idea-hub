import { createRequire } from 'node:module';

import type { CorsOptions } from 'cors';
import type { RequestHandler } from 'express';

const require = createRequire(import.meta.url);

type CorsFactory = (options?: CorsOptions) => RequestHandler;

function loadCors(): CorsFactory | null {
  let mod: unknown;
  try {
    mod = require('cors');
  } catch {
    return null;
  }
  if (typeof mod === 'function') return mod as CorsFactory;
  if (typeof mod === 'object' && mod !== null && 'default' in mod) {
    const inner = (mod as { default: unknown }).default;
    if (typeof inner === 'function') return inner as CorsFactory;
  }
  return null;
}

export function getCorsMiddleware(options: CorsOptions): RequestHandler {
  const factory = loadCors();
  if (!factory) {
    return (_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      next();
    };
  }
  try {
    return factory(options);
  } catch {
    return (_req, _res, next) => next();
  }
}
