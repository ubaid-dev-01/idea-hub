import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import pino from 'pino';
import { pinoHttp } from 'pino-http';

const isProd = process.env.NODE_ENV === 'production';
const onVercel =
  process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const level =
  process.env.LOG_LEVEL ??
  (isProd ? 'info' : 'debug');

/** Plain JSON logs on Vercel/production — pino-pretty is dev-only and not bundled on Vercel. */
export const logger =
  isProd || onVercel
    ? pino({ level })
    : pino({
        level,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      });

/**
 * HTTP request/response logging (method, url, status, duration).
 * Does not log Authorization / Cookie (see serializers).
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) => {
    const id = req.headers['x-request-id'];
    return typeof id === 'string' && id.length > 0 ? id : randomUUID();
  },
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    err?: Error
  ) => {
    if (err) return 'error';
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req: IncomingMessage) {
      return {
        id: (req as IncomingMessage & { id?: string }).id,
        method: req.method,
        url: req.url,
        remoteAddress: req.socket?.remoteAddress,
      };
    },
    res(res: ServerResponse) {
      return { statusCode: res.statusCode };
    },
  },
});

function envFlag(name: string): boolean {
  return String(process.env[name] ?? '').toLowerCase() === 'true';
}

/** Safe startup snapshot: booleans only, no secrets. */
export function logStartupSummary(port: number): void {
  const mongo = Boolean(process.env.MONGODB_URI?.trim());
  const cloudinary =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim()) &&
    Boolean(process.env.CLOUDINARY_API_KEY?.trim()) &&
    Boolean(process.env.CLOUDINARY_API_SECRET?.trim());
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const redis = Boolean(process.env.REDIS_URL?.trim());

  logger.info(
    {
      msg: 'bootstrap',
      env: process.env.NODE_ENV ?? 'development',
      port,
      logLevel: level,
      mongodb: mongo ? 'configured' : 'missing',
      cors: process.env.CORS_ORIGIN?.trim()
        ? 'configured'
        : isProd
          ? 'unset (review)'
          : 'dev-default',
      integrations: {
        cloudinary: cloudinary ? 'configured' : 'missing',
        stripe: stripe ? 'configured' : 'missing',
        redis: redis ? 'configured' : 'missing',
      },
      features: {
        validationEngine: envFlag('ENABLE_VALIDATION_ENGINE'),
        gamification: envFlag('ENABLE_GAMIFICATION'),
      },
    },
    'Ideas Hub API — configuration'
  );
}
