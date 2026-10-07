import { createRequire } from 'node:module';

import type { RequestHandler } from 'express';

const require = createRequire(import.meta.url);

type MongoSanitizeFactory = (options?: {
  replaceWith?: string;
}) => RequestHandler;

function loadMongoSanitize(): MongoSanitizeFactory | null {
  let mod: unknown;
  try {
    mod = require('express-mongo-sanitize');
  } catch {
    return null;
  }
  if (typeof mod === 'function') return mod as MongoSanitizeFactory;
  if (typeof mod === 'object' && mod !== null && 'default' in mod) {
    const inner = (mod as { default: unknown }).default;
    if (typeof inner === 'function') return inner as MongoSanitizeFactory;
  }
  return null;
}

export function getMongoSanitizeMiddleware(): RequestHandler {
  const factory = loadMongoSanitize();
  if (!factory) {
    return (_req, _res, next) => next();
  }
  try {
    return factory({ replaceWith: '_' });
  } catch {
    return (_req, _res, next) => next();
  }
}
