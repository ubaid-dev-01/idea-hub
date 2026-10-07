import type { RequestHandler } from 'express';
import mongoose from 'mongoose';

import { connectDatabase } from './config/database.js';

let ready: Promise<void> | null = null;

async function registerListeners(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;

  if (String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() === 'true') {
    const { registerValidationListeners } = await import(
      './listeners/validation.listener.js'
    );
    registerValidationListeners();
  }
  if (String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true') {
    const { registerGamificationListeners } = await import(
      './listeners/gamification.listener.js'
    );
    registerGamificationListeners();
  }
}

/** Connect MongoDB and register event listeners (idempotent). */
export async function ensureApiReady(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      try {
        await connectDatabase();
        await registerListeners();
      } catch (err) {
        ready = null;
        console.error('[api] warm-up failed (routes may return 503):', err);
      }
    })();
  }
  await ready;
}

/** First middleware on Vercel — warms DB before route handlers run. */
export const vercelReadyMiddleware: RequestHandler = (_req, _res, next) => {
  void ensureApiReady().then(() => next()).catch(next);
};
