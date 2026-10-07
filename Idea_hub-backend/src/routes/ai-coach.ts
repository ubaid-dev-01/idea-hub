import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import {
  aiCoachEnabled,
  coachFreeDailyMessageLimit,
} from '../config/ai-coach.config.js';
import { hasPaidProOrInvestor } from '../lib/subscription.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  coachChatWithLimit,
  dismissDailyBriefCard,
  generateIdeaFeedback,
  getDailyBriefForUser,
} from '../services/AICoachService.js';
import { getCoachMessagesUsedToday } from '../services/coach-chat-limit.service.js';
import { Idea, User } from '../models/index.js';

export const aiCoachRouter = Router();

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

function requireCoach(_req: Request, res: Response, next: NextFunction): void {
  if (!aiCoachEnabled()) {
    res.status(404).json({
      success: false,
      message: 'AI Coach is not enabled',
      data: null,
    });
    return;
  }
  next();
}

aiCoachRouter.use(requireDb);
aiCoachRouter.use(requireCoach);

aiCoachRouter.get('/daily-brief', requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const data = await getDailyBriefForUser(userId);
  res.json({ success: true, message: 'OK', data });
});

aiCoachRouter.post('/daily-brief/dismiss', requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  await dismissDailyBriefCard(userId);
  res.json({ success: true, message: 'OK', data: { dismissed: true } });
});

aiCoachRouter.get('/usage', requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const user = await User.findById(userId).select('role subscription').lean();
  const role = user?.role ?? 'user';
  const unlimited =
    role === 'moderator' ||
    role === 'super_admin' ||
    String(process.env.COACH_CHAT_UNLIMITED ?? '').toLowerCase() === 'true' ||
    hasPaidProOrInvestor({
      role,
      subscription: user?.subscription,
    });
  const used = await getCoachMessagesUsedToday(userId);
  const limit = unlimited ? -1 : coachFreeDailyMessageLimit();
  res.json({
    success: true,
    message: 'OK',
    data: { messagesUsedToday: used, limit, unlimited },
  });
});

aiCoachRouter.post('/chat', requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const user = await User.findById(userId).select('role subscription').lean();
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const message =
    typeof body.message === 'string' ? body.message.trim() : '';
  const ideaRaw = body.ideaId;
  const ideaId =
    ideaRaw != null &&
    ideaRaw !== '' &&
    mongoose.Types.ObjectId.isValid(String(ideaRaw))
      ? String(ideaRaw)
      : undefined;

  if (!message) {
    res.status(400).json({
      success: false,
      message: 'message is required',
      data: null,
    });
    return;
  }

  try {
    const out = await coachChatWithLimit({
      userId,
      userRole: user.role,
      subscription: user.subscription,
      message,
      ideaId,
    });
    res.json({ success: true, message: 'OK', data: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Chat failed';
    if (msg.includes('limit reached')) {
      res.status(429).json({
        success: false,
        message: msg,
        data: null,
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: msg,
      data: null,
    });
  }
});

aiCoachRouter.post(
  '/ideas/:ideaId/feedback/refresh',
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId as string;
    const { ideaId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(ideaId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request',
        data: null,
      });
      return;
    }
    const idea = await Idea.findById(ideaId).select('authorId status');
    if (!idea || String(idea.authorId) !== userId) {
      res.status(403).json({
        success: false,
        message: 'Only the author can refresh coach feedback',
        data: null,
      });
      return;
    }
    await generateIdeaFeedback(ideaId);
    const fresh = await Idea.findById(ideaId);
    if (!fresh) {
      res.status(500).json({
        success: false,
        message: 'Failed',
        data: null,
      });
      return;
    }
    const { attachAiCoachForAuthor, ideaToApi } = await import(
      '../lib/serialize-idea.js'
    );
    const payload = ideaToApi(fresh);
    attachAiCoachForAuthor(fresh, payload, userId);
    res.json({ success: true, message: 'OK', data: { idea: payload } });
  }
);

aiCoachRouter.get('/opening', requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const user = await User.findById(userId).select('fullName username').lean();
  const n = await Idea.countDocuments({
    authorId: new mongoose.Types.ObjectId(userId),
    status: 'published',
  });
  const name = user?.fullName?.trim() || user?.username || 'there';
  const opening =
    n === 0
      ? `Hi ${name}! I'm your AI Idea Coach. Publish your first idea and I'll help you sharpen it.`
      : `Hi ${name}! I've got context on your ${n} published idea${n === 1 ? '' : 's'}. Ask me anything about positioning, traction, or your next experiment.`;
  res.json({
    success: true,
    message: 'OK',
    data: { ideaCount: n, openingMessage: opening },
  });
});
