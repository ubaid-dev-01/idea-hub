import { createRequire } from 'node:module';

import type { Request, RequestHandler, Response } from 'express';

const require = createRequire(import.meta.url);

type CompressionFactory = (options: {
  level?: number;
  threshold?: number;
  filter?: (req: Request, res: Response) => boolean;
}) => RequestHandler;

function loadCompressionFactory(): CompressionFactory | null {
  let mod: unknown;
  try {
    mod = require('compression');
  } catch {
    return null;
  }

  if (typeof mod === 'function') {
    return mod as CompressionFactory;
  }

  if (typeof mod === 'object' && mod !== null && 'default' in mod) {
    const inner = (mod as { default: unknown }).default;
    if (typeof inner === 'function') {
      return inner as CompressionFactory;
    }
  }

  return null;
}

/** Optional gzip — skipped if compression cannot be loaded (serverless bundle interop). */
export function getCompressionMiddleware(): RequestHandler | null {
  const factory = loadCompressionFactory();
  if (!factory) return null;

  try {
    const mod: unknown = require('compression');
    const filterFn =
      typeof mod === 'object' && mod !== null && 'filter' in mod
        ? (mod as { filter: (req: Request, res: Response) => boolean }).filter
        : typeof mod === 'object' &&
            mod !== null &&
            'default' in mod &&
            typeof (mod as { default: { filter?: (req: Request, res: Response) => boolean } }).default === 'object'
          ? (mod as { default: { filter?: (req: Request, res: Response) => boolean } }).default.filter
          : undefined;

    return factory({
      level: 6,
      threshold: 2048,
      filter: (req: Request, res: Response) => {
        if (req.headers['x-no-compression']) return false;
        return filterFn ? filterFn(req, res) : true;
      },
    });
  } catch {
    return null;
  }
}
