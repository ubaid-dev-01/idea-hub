import express, { type Express } from 'express';

import { vercelReadyMiddleware } from './bootstrap-api.js';
import { getCompressionMiddleware } from './lib/compression.js';
import { getCorsMiddleware } from './lib/cors.js';
import { getSecurityHeaders } from './lib/helmet.js';
import { httpLogger } from './lib/logger.js';
import { getMongoSanitizeMiddleware } from './lib/mongo-sanitize.js';
import type { CorsOptions } from 'cors';
import { getGlobalApiLimiter } from './middleware/api-rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestTimeout } from './middleware/request-timeout.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { behaviorRouter } from './routes/behavior.js';
import { ideasRouter } from './routes/ideas.js';
import { uploadRouter } from './routes/upload.js';
import { usersRouter } from './routes/users.js';
import { progressRouter } from './routes/progress.js';
import { marketplaceRouter } from './routes/marketplace.js';
import { liveRoomsRouter } from './routes/live-rooms.js';
import { aiCoachRouter } from './routes/ai-coach.js';
import { collectionsRouter } from './routes/collections.js';
import { stripeWebhookRoute } from './routes/stripe-webhook.js';
import { subscriptionsRouter } from './routes/subscriptions.js';
import { storiesRouter } from './routes/stories.js';
import { healthRouter } from './routes/health.js';

const defaultDevOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

/** Browsers send Origin without a trailing slash — FRONTEND_URL must match exactly. */
function normalizeOrigin(url: string): string {
  return url.trim().replace(/\/$/, '');
}

function resolveCorsOrigin(): boolean | string | string[] {
  const front = process.env.FRONTEND_URL?.trim();
  if (front) return normalizeOrigin(front);
  const raw = process.env.CORS_ORIGIN?.trim();
  if (raw) {
    const list = raw
      .split(',')
      .map((s) => normalizeOrigin(s))
      .filter(Boolean);
    if (list.length > 0) return list;
  }
  if (process.env.NODE_ENV !== 'production') {
    return defaultDevOrigins;
  }
  return true;
}

const corsOptions: CorsOptions = {
  origin: resolveCorsOrigin(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1' || process.env.VERCEL === 'true';
}

export function createApp(): Express {
  const app = express();
  /** JSON responses default to ETag → browsers send If-None-Match → 304 with empty body breaks axios clients. */
  app.set('etag', false);

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
  }

  app.use(healthRouter);

  if (isVercelRuntime()) {
    app.use(vercelReadyMiddleware);
  }

  const compressMiddleware = getCompressionMiddleware();
  if (compressMiddleware) {
    app.use(compressMiddleware);
  }

  app.use(getSecurityHeaders());

  const corsMiddleware = getCorsMiddleware(corsOptions);
  app.use(corsMiddleware);
  app.options('*', corsMiddleware);

  app.use(httpLogger);

  app.post(
    '/api/subscriptions/webhook',
    express.raw({ type: 'application/json' }),
    (req, res, next) => {
      void stripeWebhookRoute(req, res).catch(next);
    }
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(getMongoSanitizeMiddleware());

  app.use(getGlobalApiLimiter());
  app.use(requestTimeout(Number(process.env.REQUEST_TIMEOUT_MS) || 30_000));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/collections', collectionsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/behavior', behaviorRouter);
  app.use('/api/progress', progressRouter);
  app.use('/api/marketplace', marketplaceRouter);
  app.use('/api/live-rooms', liveRoomsRouter);
  app.use('/api/coach', aiCoachRouter);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      data: null,
      errors: [],
    });
  });

  app.use(errorHandler);

  return app;
}
