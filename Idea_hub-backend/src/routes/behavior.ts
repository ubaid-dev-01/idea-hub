import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import { requireAuth } from '../middleware/require-auth.js';
import { recordBehaviorAndUpdateProfile } from '../services/interest-profile.service.js';

export const behaviorRouter = Router();

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

const ingestSchema = z.object({
  eventType: z.enum([
    'view',
    'like',
    'share',
    'comment',
    'save',
    'collab_request',
    'search',
    'click',
    'scroll_depth',
  ]),
  ideaId: z.string().optional().nullable(),
  sessionId: z.string().min(8).max(200),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
  scrollPercent: z.number().min(0).max(100).optional(),
  source: z.enum(['feed', 'search', 'profile', 'notification', 'trending']),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']),
});

behaviorRouter.post('/', requireDb, requireAuth, async (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join('; ');
    res.status(400).json({
      success: false,
      message: msg || 'Invalid body',
      data: null,
    });
    return;
  }

  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const { ideaId: rawIdeaId, ...rest } = parsed.data;
  let ideaOid: mongoose.Types.ObjectId | null = null;
  if (rawIdeaId && mongoose.Types.ObjectId.isValid(rawIdeaId)) {
    ideaOid = new mongoose.Types.ObjectId(rawIdeaId);
  }

  await recordBehaviorAndUpdateProfile({
    userId: new mongoose.Types.ObjectId(userId),
    eventType: rest.eventType,
    ideaId: ideaOid,
    sessionId: rest.sessionId,
    durationMs: rest.durationMs,
    scrollPercent: rest.scrollPercent,
    source: rest.source,
    deviceType: rest.deviceType,
  });

  res.status(201).json({ success: true, message: 'Recorded', data: null });
});
