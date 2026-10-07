import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import { BADGE_DEFINITIONS } from '../config/xp.config.js';
import { optionalAuth } from '../middleware/optional-auth.js';
import { requireAuth } from '../middleware/require-auth.js';
import { Follow, User } from '../models/index.js';
import {
  currentWeekBucket,
  ensureUserProgress,
  getLeaderboard,
  getUserRank,
  isGamificationEnabled,
  onValidationVote,
  progressToApi,
  recordDailyActivity,
} from '../services/gamification.service.js';

export const progressRouter = Router();

const IDEA_CATEGORIES = new Set([
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
]);

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

function gamificationOr404(res: Response): boolean {
  if (!isGamificationEnabled()) {
    res.status(404).json({
      success: false,
      message: 'Gamification is disabled',
      data: null,
    });
    return false;
  }
  return true;
}

/** Public badge catalog (definitions + how to earn). */
progressRouter.get('/badges', requireDb, (_req, res) => {
  if (!gamificationOr404(res)) return;
  res.json({
    success: true,
    message: 'OK',
    data: BADGE_DEFINITIONS,
  });
});

progressRouter.get('/me', requireDb, requireAuth, async (req, res) => {
  if (!gamificationOr404(res)) return;
  const userId = res.locals.authUserId as string;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  await recordDailyActivity(userId);
  const doc = await ensureUserProgress(userId);
  if (!doc) {
    res.status(404).json({
      success: false,
      message: 'Progress not found',
      data: null,
    });
    return;
  }
  res.json({
    success: true,
    message: 'OK',
    data: progressToApi(doc),
  });
});

progressRouter.get(
  '/leaderboard',
  requireDb,
  optionalAuth,
  async (req, res) => {
    if (!gamificationOr404(res)) return;

    const scopeRaw =
      typeof req.query.scope === 'string' ? req.query.scope.trim() : 'global';
    const categoryRaw =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';

    if (!['global', 'following', 'category'].includes(scopeRaw)) {
      res.status(400).json({
        success: false,
        message: 'scope must be global, following, or category',
        data: null,
      });
      return;
    }

    const weekBucket = currentWeekBucket();
    const limit = 20;

    let followingIds: mongoose.Types.ObjectId[] | undefined;
    let category: string | undefined;

    if (scopeRaw === 'global') {
      followingIds = undefined;
      category = undefined;
    } else if (scopeRaw === 'following') {
      const userId = res.locals.authUserId as string | undefined;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
          success: false,
          message: 'Sign in to view following leaderboard',
          data: null,
        });
        return;
      }
      const follows = await Follow.find({
        followerId: new mongoose.Types.ObjectId(userId),
      })
        .select('followingId')
        .lean<{ followingId: mongoose.Types.ObjectId }[]>();
      followingIds = follows.map((f) => f.followingId);
      if (categoryRaw && IDEA_CATEGORIES.has(categoryRaw)) {
        category = categoryRaw;
      }
    } else {
      if (!IDEA_CATEGORIES.has(categoryRaw)) {
        res.status(400).json({
          success: false,
          message: 'Valid category query is required when scope=category',
          data: null,
        });
        return;
      }
      category = categoryRaw;
    }

    const rows = await getLeaderboard({
      weekBucket,
      limit,
      followingIds,
      category,
    });

    const meId = res.locals.authUserId as string | undefined;
    let myRank: number | null = null;
    let myRow: (typeof rows)[0] | null = null;
    if (meId && mongoose.Types.ObjectId.isValid(meId)) {
      myRank = await getUserRank(meId, weekBucket);
      const inTop = rows.some((r) => r.userId === meId);
      if (!inTop && myRank !== null) {
        const doc = await ensureUserProgress(meId);
        if (doc) {
          const u = await User.findById(meId)
            .select('username fullName avatarUrl')
            .lean<{
              username?: string;
              fullName?: string;
              avatarUrl?: string;
            } | null>();
          myRow = {
            rank: myRank,
            userId: meId,
            username: u?.username ?? '',
            fullName: u?.fullName ?? '',
            avatarUrl: u?.avatarUrl ?? '',
            weeklyXpEarned: doc.weeklyXpEarned ?? 0,
            level: doc.level ?? 1,
            levelTitle: doc.levelTitle ?? 'Idea Spark',
          };
        }
      }
    }

    res.json({
      success: true,
      message: 'OK',
      data: {
        weekBucket,
        scope: scopeRaw,
        rows,
        myRank,
        myRow,
      },
    });
  }
);

/** Records a validation vote for XP / badges / weekly challenge (UI can call when voting). */
progressRouter.post(
  '/validation-vote',
  requireDb,
  requireAuth,
  async (req, res) => {
    if (!gamificationOr404(res)) return;
    const userId = res.locals.authUserId as string;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }
    await onValidationVote(userId);
    const doc = await ensureUserProgress(userId);
    res.json({
      success: true,
      message: 'OK',
      data: doc ? progressToApi(doc) : null,
    });
  }
);
