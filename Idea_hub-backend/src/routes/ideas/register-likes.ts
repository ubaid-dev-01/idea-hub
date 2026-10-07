import type { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../../middleware/require-auth.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { Idea, Like, User } from '../../models/index.js';
import { userToApi } from '../../lib/serialize-user.js';
import { requireDb } from './guards.js';

const LIKES_PAGE = 30;

export function registerLikeRoutes(ideasRouter: Router): void {
  ideasRouter.get('/:id/likes', requireDb, optionalAuth, async (req, res) => {
    const { id: ideaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid idea id',
        data: null,
      });
      return;
    }

    const ideaExists = await Idea.exists({ _id: ideaId });
    if (!ideaExists) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const filter: Record<string, unknown> = {
      ideaId: new mongoose.Types.ObjectId(ideaId),
    };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const likes = await Like.find(filter)
      .sort({ _id: -1 })
      .limit(LIKES_PAGE + 1)
      .select('userId createdAt')
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          userId: mongoose.Types.ObjectId;
          createdAt: Date;
        }>
      >();

    const hasMore = likes.length > LIKES_PAGE;
    const page = hasMore ? likes.slice(0, LIKES_PAGE) : likes;
    const userIds = [...new Set(page.map((l) => String(l.userId)))];
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map((u) => [String(u._id), userToApi(u)]));

    const rows = page.map((l) => ({
      userId: String(l.userId),
      likedAt:
        l.createdAt instanceof Date
          ? l.createdAt.toISOString()
          : String(l.createdAt),
      user: userMap.get(String(l.userId)) ?? null,
    }));

    const nextCursor =
      hasMore && page.length > 0
        ? String(page[page.length - 1]!._id)
        : undefined;

    res.json({
      success: true,
      message: 'OK',
      data: rows,
      meta: {
        nextCursor,
        hasMore: Boolean(nextCursor),
      },
    });
  });

  ideasRouter.post('/:id/like', requireDb, requireAuth, async (req, res) => {
    const { id: ideaId } = req.params;
    const userId = res.locals.authUserId;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(ideaId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid idea id',
        data: null,
      });
      return;
    }

    const ideaOid = new mongoose.Types.ObjectId(ideaId);
    const userOid = new mongoose.Types.ObjectId(userId);

    const ideaExists = await Idea.exists({ _id: ideaOid });
    if (!ideaExists) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    const existing = await Like.findOneAndDelete({
      userId: userOid,
      ideaId: ideaOid,
    });

    if (existing) {
      const idea = await Idea.findById(ideaOid).select('likeCount').lean();
      res.json({
        success: true,
        message: 'OK',
        data: {
          liked: false,
          likeCount: Math.max(0, idea?.likeCount ?? 0),
        },
      });
      return;
    }

    try {
      await Like.create({ userId: userOid, ideaId: ideaOid });
    } catch (err) {
      const dup =
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: number }).code === 11000;
      if (!dup) {
        console.error(err);
        res.status(500).json({
          success: false,
          message: 'Like failed',
          data: null,
        });
        return;
      }
    }

    const idea = await Idea.findById(ideaOid).select('likeCount').lean();
    res.json({
      success: true,
      message: 'OK',
      data: {
        liked: true,
        likeCount: idea?.likeCount ?? 0,
      },
    });
  });
}
