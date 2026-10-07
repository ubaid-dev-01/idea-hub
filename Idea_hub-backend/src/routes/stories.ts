import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../middleware/require-auth.js';
import { Story, STORY_LIFETIME_MS, User } from '../models/index.js';
import {
  assertTextAllowed,
  ContentBlockedError,
} from '../services/groq-moderation.service.js';

export const storiesRouter = Router();

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

const AUTHOR_SELECT = 'username fullName avatarUrl';

/** Active stories (not expired), newest first — grouped by author for the bar. */
storiesRouter.get('/', requireDb, async (_req, res) => {
  const now = new Date();
  const stories = await Story.find({ expiresAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .limit(120)
    .populate('authorId', AUTHOR_SELECT)
    .lean();

  res.json({
    success: true,
    message: 'OK',
    data: { stories },
  });
});

/** Create a story (media already uploaded via /api/upload). Expires in 24h. */
storiesRouter.post('/', requireDb, requireAuth, async (req, res) => {
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
    mediaUrl?: unknown;
    thumbnailUrl?: unknown;
    mediaType?: unknown;
    caption?: unknown;
  };

  const mediaUrl =
    typeof body.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
  if (!mediaUrl || !/^https?:\/\//i.test(mediaUrl)) {
    res.status(400).json({
      success: false,
      message: 'mediaUrl must be a valid http(s) URL',
      data: null,
    });
    return;
  }

  const mediaType =
    body.mediaType === 'video'
      ? 'video'
      : body.mediaType === 'image'
        ? 'image'
        : null;
  if (!mediaType) {
    res.status(400).json({
      success: false,
      message: 'mediaType must be "image" or "video"',
      data: null,
    });
    return;
  }

  const activeCount = await Story.countDocuments({
    authorId: userId,
    expiresAt: { $gt: new Date() },
  });
  if (activeCount >= 10) {
    res.status(400).json({
      success: false,
      message: 'Maximum 10 active stories. Wait for older ones to expire.',
      data: null,
    });
    return;
  }

  const caption =
    typeof body.caption === 'string' ? body.caption.trim().slice(0, 200) : '';
  const thumbnailUrl =
    typeof body.thumbnailUrl === 'string' ? body.thumbnailUrl.trim() : '';

  if (caption) {
    try {
      await assertTextAllowed(caption);
    } catch (e) {
      if (e instanceof ContentBlockedError) {
        res.status(400).json({
          success: false,
          message: e.message,
          data: { categories: e.categories },
        });
        return;
      }
      throw e;
    }
  }

  const expiresAt = new Date(Date.now() + STORY_LIFETIME_MS);
  const doc = await Story.create({
    authorId: userId,
    mediaUrl,
    thumbnailUrl: thumbnailUrl || mediaUrl,
    mediaType,
    caption,
    expiresAt,
  });

  const populated = await Story.findById(doc._id)
    .populate('authorId', AUTHOR_SELECT)
    .lean();

  res.status(201).json({
    success: true,
    message: 'Story posted — disappears in 24 hours',
    data: { story: populated },
  });
});

storiesRouter.delete('/:id', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  const { id } = req.params;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid story id',
      data: null,
    });
    return;
  }

  const story = await Story.findById(id);
  if (!story) {
    res.status(404).json({
      success: false,
      message: 'Story not found',
      data: null,
    });
    return;
  }
  if (String(story.authorId) !== userId) {
    const me = await User.findById(userId).select('role');
    if (me?.role !== 'super_admin' && me?.role !== 'moderator') {
      res.status(403).json({
        success: false,
        message: 'Not your story',
        data: null,
      });
      return;
    }
  }

  await story.deleteOne();
  res.json({
    success: true,
    message: 'Story removed',
    data: null,
  });
});
