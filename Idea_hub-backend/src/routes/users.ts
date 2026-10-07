import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import { optionalAuth } from '../middleware/optional-auth.js';
import { attachAiCoachForAuthor, ideaToApi } from '../lib/serialize-idea.js';
import { notificationToApi } from '../lib/serialize-notification.js';
import { userToApi, userToApiPublic } from '../lib/serialize-user.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { IUserDocument } from '../models/User.model.js';
import {
  Follow,
  Idea,
  Notification,
  SavedIdea,
  User,
} from '../models/index.js';
import {
  getUserCollaborationsList,
  getUserDashboardData,
} from '../services/user-dashboard.service.js';
import { mapIdeasForPublicApi } from './ideas/map-public.js';

export const usersRouter = Router();

const LIST_PAGE = 20;

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  );
}

const FOLLOW_POPULATE_SELECT =
  'username email fullName bio avatarUrl role status isEmailVerified skills followerCount followingCount totalIdeasPosted notificationPreferences createdAt verifiedInnovator';

async function listFollowersPage(
  targetUserId: mongoose.Types.ObjectId,
  cursor: string
): Promise<{
  users: IUserDocument[];
  nextCursor: string | undefined;
}> {
  const filter: Record<string, unknown> = { followingId: targetUserId };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  const docs = await Follow.find(filter)
    .sort({ _id: -1 })
    .limit(LIST_PAGE + 1)
    .populate({ path: 'followerId', select: FOLLOW_POPULATE_SELECT })
    .lean();
  const hasMore = docs.length > LIST_PAGE;
  const page = hasMore ? docs.slice(0, LIST_PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;
  const users = page
    .map((d) => d.followerId as unknown)
    .filter((u): u is IUserDocument => Boolean(u && typeof u === 'object' && '_id' in (u as object)));
  return { users, nextCursor };
}

async function listFollowingPage(
  targetUserId: mongoose.Types.ObjectId,
  cursor: string
): Promise<{
  users: IUserDocument[];
  nextCursor: string | undefined;
}> {
  const filter: Record<string, unknown> = { followerId: targetUserId };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  const docs = await Follow.find(filter)
    .sort({ _id: -1 })
    .limit(LIST_PAGE + 1)
    .populate({ path: 'followingId', select: FOLLOW_POPULATE_SELECT })
    .lean();
  const hasMore = docs.length > LIST_PAGE;
  const page = hasMore ? docs.slice(0, LIST_PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;
  const users = page
    .map((d) => d.followingId as unknown)
    .filter((u): u is IUserDocument => Boolean(u && typeof u === 'object' && '_id' in (u as object)));
  return { users, nextCursor };
}

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

usersRouter.get('/me', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  res.json({
    success: true,
    message: 'OK',
    data: userToApi(user),
  });
});

usersRouter.get('/me/dashboard', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  try {
    const data = await getUserDashboardData(userId);
    res.json({
      success: true,
      message: 'OK',
      data,
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
      return;
    }
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
      data: null,
    });
  }
});

usersRouter.get('/me/collaborations', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  try {
    const data = await getUserCollaborationsList(userId);
    res.json({
      success: true,
      message: 'OK',
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to load collaborations',
      data: null,
    });
  }
});

usersRouter.patch(
  '/me',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const fullName =
      typeof body.fullName === 'string' ? body.fullName.trim() : undefined;
    const bio =
      typeof body.bio === 'string' ? body.bio.trim().slice(0, 500) : undefined;
    const usernameIn =
      typeof body.username === 'string'
        ? body.username.trim().toLowerCase()
        : undefined;
    const avatarUrlIn =
      typeof body.avatarUrl === 'string' ? body.avatarUrl.trim().slice(0, 2048) : undefined;

    if (fullName !== undefined && fullName.length > 0) {
      user.fullName = fullName.slice(0, 120);
    }
    if (bio !== undefined) {
      user.bio = bio;
    }

    if (usernameIn !== undefined && usernameIn !== user.username) {
      const taken = await User.findOne({
        username: usernameIn,
        _id: { $ne: user._id },
      })
        .select('_id')
        .lean();
      if (taken) {
        res.status(409).json({
          success: false,
          message: 'That username is already taken',
          data: null,
        });
        return;
      }
      user.username = usernameIn;
    }

    if (Array.isArray(body.skills)) {
      const arr = body.skills
        .filter((s): s is string => typeof s === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      user.skills = arr;
    } else if (typeof body.skills === 'string') {
      const arr = body.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      user.skills = arr;
    }

    if (avatarUrlIn) {
      user.avatarUrl = avatarUrlIn;
    }

    try {
      await user.save();
    } catch (err) {
      if (isDuplicateKey(err)) {
        res.status(409).json({
          success: false,
          message: 'Username already taken',
          data: null,
        });
        return;
      }
      if (err instanceof mongoose.Error.ValidationError) {
        const first = Object.values(err.errors)[0];
        res.status(400).json({
          success: false,
          message: first?.message ?? 'Validation failed',
          data: null,
        });
        return;
      }
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Update failed',
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      message: 'OK',
      data: userToApi(user),
    });
  }
);

usersRouter.post(
  '/me/verification-request',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    const body = req.body as { message?: unknown };
    const message =
      typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
      return;
    }

    if (user.verifiedInnovator) {
      res.status(400).json({
        success: false,
        message: 'You are already verified',
        data: null,
      });
      return;
    }

    user.set('verificationRequestAt', new Date());
    user.set('verificationRequestMessage', message);
    await user.save();

    res.json({
      success: true,
      message: 'OK',
      data: userToApi(user),
    });
  }
);

usersRouter.get('/me/notifications', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const recipientOid = new mongoose.Types.ObjectId(userId);
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const unreadOnly =
    req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';

  const filter: Record<string, unknown> = { recipientId: recipientOid };
  if (unreadOnly) {
    filter.isRead = false;
  }
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const docs = await Notification.find(filter)
    .sort({ _id: -1 })
    .limit(LIST_PAGE + 1)
    .populate({
      path: 'senderId',
      select:
        'username email fullName bio avatarUrl role status isEmailVerified skills followerCount followingCount totalIdeasPosted notificationPreferences createdAt',
    });

  const hasMore = docs.length > LIST_PAGE;
  const page = hasMore ? docs.slice(0, LIST_PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;

  const data = page.map((doc) => {
    const s = doc.senderId;
    const sender =
      s && typeof s === 'object' && '_id' in s
        ? (s as unknown as IUserDocument)
        : null;
    return notificationToApi(doc, sender);
  });

  res.json({
    success: true,
    message: 'OK',
    data,
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

usersRouter.patch(
  '/me/notifications/read-all',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }
    await Notification.updateMany(
      {
        recipientId: new mongoose.Types.ObjectId(userId),
        isRead: false,
      },
      { $set: { isRead: true } }
    );
    res.json({ success: true, message: 'OK', data: null });
  }
);

usersRouter.patch(
  '/me/notifications/:id/read',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId;
    const { id } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid notification id',
        data: null,
      });
      return;
    }
    const r = await Notification.updateOne(
      {
        _id: id,
        recipientId: new mongoose.Types.ObjectId(userId),
      },
      { $set: { isRead: true } }
    );
    if (r.matchedCount === 0) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
        data: null,
      });
      return;
    }
    res.json({ success: true, message: 'OK', data: null });
  }
);

usersRouter.get('/me/saved-ideas', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const userOid = new mongoose.Types.ObjectId(userId);
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

  const filter: Record<string, unknown> = { userId: userOid };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const saves = await SavedIdea.find(filter)
    .sort({ _id: -1 })
    .limit(LIST_PAGE + 1)
    .select('ideaId')
    .lean<{ _id: mongoose.Types.ObjectId; ideaId: mongoose.Types.ObjectId }[]>();

  const hasMore = saves.length > LIST_PAGE;
  const page = hasMore ? saves.slice(0, LIST_PAGE) : saves;
  const ideaIds = page.map((s) => s.ideaId);
  const ideas =
    ideaIds.length > 0
      ? await Idea.find({ _id: { $in: ideaIds } })
      : [];
  const byId = new Map(ideas.map((i) => [String(i._id), i]));
  const ordered = ideaIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean) as typeof ideas;

  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;

  res.json({
    success: true,
    message: 'OK',
    data: await mapIdeasForPublicApi(ordered, userId),
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

usersRouter.post(
  '/me/saved-ideas/:ideaId',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId;
    const { ideaId } = req.params;
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
    const ideaExists = await Idea.exists({ _id: ideaId });
    if (!ideaExists) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }
    let inserted = false;
    try {
      await SavedIdea.create({
        userId: new mongoose.Types.ObjectId(userId),
        ideaId: new mongoose.Types.ObjectId(ideaId),
      });
      inserted = true;
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
          message: 'Save failed',
          data: null,
        });
        return;
      }
    }
    if (
      inserted &&
      String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true'
    ) {
      const { onSavedIdea } = await import('../services/gamification.service.js');
      void onSavedIdea(userId);
    }
    res.status(201).json({ success: true, message: 'Saved', data: null });
  }
);

usersRouter.delete(
  '/me/saved-ideas/:ideaId',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId;
    const { ideaId } = req.params;
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
    await SavedIdea.deleteOne({
      userId: new mongoose.Types.ObjectId(userId),
      ideaId: new mongoose.Types.ObjectId(ideaId),
    });
    res.json({ success: true, message: 'OK', data: null });
  }
);

usersRouter.get('/me/followers', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const { users, nextCursor } = await listFollowersPage(
    new mongoose.Types.ObjectId(userId),
    cursor
  );
  res.json({
    success: true,
    message: 'OK',
    data: users.map((u) => userToApiPublic(u)),
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

usersRouter.get('/me/following', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const { users, nextCursor } = await listFollowingPage(
    new mongoose.Types.ObjectId(userId),
    cursor
  );
  res.json({
    success: true,
    message: 'OK',
    data: users.map((u) => userToApiPublic(u)),
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

usersRouter.post(
  '/:userId/follow',
  requireDb,
  requireAuth,
  async (req, res) => {
    const followerId = res.locals.authUserId;
    const { userId: targetId } = req.params;
    if (
      !followerId ||
      !mongoose.Types.ObjectId.isValid(followerId) ||
      !mongoose.Types.ObjectId.isValid(targetId)
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid user id',
        data: null,
      });
      return;
    }
    if (followerId === targetId) {
      res.status(400).json({
        success: false,
        message: 'You cannot follow yourself',
        data: null,
      });
      return;
    }
    const targetExists = await User.exists({ _id: targetId });
    if (!targetExists) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
      return;
    }
    try {
      await Follow.create({
        followerId: new mongoose.Types.ObjectId(followerId),
        followingId: new mongoose.Types.ObjectId(targetId),
      });
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
          message: 'Follow failed',
          data: null,
        });
        return;
      }
    }
    res.status(201).json({ success: true, message: 'OK', data: null });
  }
);

usersRouter.delete(
  '/:userId/follow',
  requireDb,
  requireAuth,
  async (req, res) => {
    const followerId = res.locals.authUserId;
    const { userId: targetId } = req.params;
    if (
      !followerId ||
      !mongoose.Types.ObjectId.isValid(followerId) ||
      !mongoose.Types.ObjectId.isValid(targetId)
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid user id',
        data: null,
      });
      return;
    }
    await Follow.findOneAndDelete({
      followerId: new mongoose.Types.ObjectId(followerId),
      followingId: new mongoose.Types.ObjectId(targetId),
    });
    res.json({ success: true, message: 'OK', data: null });
  }
);

/** Published public ideas by author (cursor = older than this idea _id). */
usersRouter.get('/:userId/ideas', requireDb, optionalAuth, async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid user id',
      data: null,
    });
    return;
  }

  const authorOid = new mongoose.Types.ObjectId(userId);
  const authorExists = await User.exists({ _id: authorOid });
  if (!authorExists) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }

  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';

  const viewerId = res.locals.authUserId as string | undefined;
  const isSelf = Boolean(viewerId && viewerId === userId);

  const filter: Record<string, unknown> = {
    authorId: authorOid,
  };
  if (isSelf) {
    filter.status = { $in: ['published', 'ai_scanning'] };
  } else {
    filter.status = 'published';
    filter.visibility = 'public';
  }
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }

  const docs = await Idea.find(filter)
    .sort({ _id: -1 })
    .limit(LIST_PAGE + 1);

  const hasMore = docs.length > LIST_PAGE;
  const page = hasMore ? docs.slice(0, LIST_PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;

  const viewer = res.locals.authUserId as string | undefined;
  res.json({
    success: true,
    message: 'OK',
    data: {
      ideas: page.map((i) => {
        const j = ideaToApi(i);
        attachAiCoachForAuthor(i, j, viewer ?? null);
        return j;
      }),
    },
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

/** Followers list by username (register before GET /:username). */
usersRouter.get('/:username/followers', requireDb, optionalAuth, async (req, res) => {
  const raw =
    typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!raw || raw.length > 30) {
    res.status(400).json({
      success: false,
      message: 'Invalid username',
      data: null,
    });
    return;
  }
  const user = await User.findOne({ username: raw.toLowerCase() }).select('_id');
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const { users, nextCursor } = await listFollowersPage(
    user._id as mongoose.Types.ObjectId,
    cursor
  );
  res.json({
    success: true,
    message: 'OK',
    data: users.map((u) => userToApiPublic(u)),
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

/** Following list by username. */
usersRouter.get('/:username/following', requireDb, optionalAuth, async (req, res) => {
  const raw =
    typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!raw || raw.length > 30) {
    res.status(400).json({
      success: false,
      message: 'Invalid username',
      data: null,
    });
    return;
  }
  const user = await User.findOne({ username: raw.toLowerCase() }).select('_id');
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const { users, nextCursor } = await listFollowingPage(
    user._id as mongoose.Types.ObjectId,
    cursor
  );
  res.json({
    success: true,
    message: 'OK',
    data: users.map((u) => userToApiPublic(u)),
    meta: {
      nextCursor,
      hasMore: Boolean(nextCursor),
    },
  });
});

/** Public profile by username (from URL /profile/:username). */
usersRouter.get('/:username', requireDb, optionalAuth, async (req, res) => {
  const raw = typeof req.params.username === 'string' ? req.params.username.trim() : '';
  if (!raw || raw.length > 30) {
    res.status(400).json({
      success: false,
      message: 'Invalid username',
      data: null,
    });
    return;
  }

  const user = await User.findOne({ username: raw.toLowerCase() });
  if (!user || user.status === 'banned') {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }

  const viewerId = res.locals.authUserId as string | undefined;
  const payload: Record<string, unknown> = {
    ...userToApiPublic(user),
  };
  if (viewerId && viewerId !== String(user._id)) {
    const follows = await Follow.exists({
      followerId: new mongoose.Types.ObjectId(viewerId),
      followingId: user._id as mongoose.Types.ObjectId,
    });
    payload.isFollowing = Boolean(follows);
  } else {
    payload.isFollowing = false;
  }

  res.json({
    success: true,
    message: 'OK',
    data: payload,
  });
});
