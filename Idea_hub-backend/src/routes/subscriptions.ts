import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../middleware/require-auth.js';
import { User } from '../models/index.js';
import {
  createBillingPortalSession,
  createCheckoutSession,
  getStripe,
  syncSubscriptionFromStripe,
} from '../services/stripe-billing.service.js';

export const subscriptionsRouter = Router();

function requireDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      data: null,
    });
    return;
  }
  next();
}

subscriptionsRouter.get('/status', requireDb, (_req, res) => {
  const configured = Boolean(getStripe());
  res.json({
    success: true,
    message: 'OK',
    data: {
      stripeConfigured: configured,
    },
  });
});

subscriptionsRouter.post(
  '/checkout',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId as string;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    const body = req.body as {
      plan?: unknown;
      interval?: unknown;
    };
    if (body.plan !== 'pro' && body.plan !== 'investor') {
      res.status(400).json({
        success: false,
        message: 'plan must be "pro" or "investor"',
        data: null,
      });
      return;
    }
    const plan = body.plan;
    const interval = body.interval === 'year' ? 'year' : 'month';

    const user = await User.findById(userId).select('email');
    if (!user?.email) {
      res.status(400).json({
        success: false,
        message: 'User email required for checkout',
        data: null,
      });
      return;
    }

    const session = await createCheckoutSession({
      userId,
      email: user.email,
      plan,
      interval,
    });

    if ('error' in session) {
      res.status(400).json({
        success: false,
        message: session.error,
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      message: 'OK',
      data: { url: session.url },
    });
  }
);

subscriptionsRouter.get(
  '/portal',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId as string;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    const session = await createBillingPortalSession(userId);
    if ('error' in session) {
      res.status(400).json({
        success: false,
        message: session.error,
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      message: 'OK',
      data: { url: session.url },
    });
  }
);

/** After Checkout success: pull Stripe subscription into the user doc (webhook fallback). */
subscriptionsRouter.post(
  '/sync',
  requireDb,
  requireAuth,
  async (_req, res) => {
    const userId = res.locals.authUserId as string;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    const user = await User.findById(userId).select('email subscription');
    if (!user?.email) {
      res.status(400).json({
        success: false,
        message: 'User email required',
        data: null,
      });
      return;
    }

    const result = await syncSubscriptionFromStripe({
      userId,
      email: user.email,
    });

    const fresh = await User.findById(userId).select('subscription');
    res.json({
      success: true,
      message: result.synced ? 'Subscription synced' : result.reason,
      data: {
        synced: result.synced,
        reason: result.synced ? undefined : result.reason,
        plan: result.synced ? result.plan : fresh?.subscription?.plan ?? 'free',
        status: result.synced
          ? result.status
          : fresh?.subscription?.status ?? 'active',
        subscription: fresh?.subscription ?? null,
      },
    });
  }
);
