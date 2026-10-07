import type { Request, Response } from 'express';
import mongoose from 'mongoose';

import {
  createInitialIdeaVersion,
} from '../../lib/idea-versioning.js';
import type { IUserSubscription } from '../../models/User.model.js';
import { Idea, User } from '../../models/index.js';
import {
  FREE_TIER_IDEAS_PER_MONTH,
  getEffectivePlan,
  scanJobPriorityForUser,
  startOfUtcMonth,
} from '../../lib/subscription.js';
import {
  assertTextAllowed,
  ContentBlockedError,
} from '../../services/groq-moderation.service.js';
import { CATEGORIES, MEDIA_TYPES } from './constants.js';
import { mapIdeasForPublicApi } from './map-public.js';

export async function postCreateIdea(req: Request, res: Response): Promise<void> {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const exists = await User.exists({ _id: userId });
  if (!exists) {
    res.status(401).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  const category =
    typeof body.category === 'string' ? body.category.trim() : '';
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const visibility = body.visibility;
  const collaboratorsOpen = Boolean(body.collaboratorsOpen);
  const requiredSkills = Array.isArray(body.requiredSkills)
    ? body.requiredSkills
    : [];
  const mediaIn = Array.isArray(body.media) ? body.media : [];
  const parentRaw = body.parentIdeaId;
  const parentIdeaIdStr =
    typeof parentRaw === 'string' && mongoose.Types.ObjectId.isValid(parentRaw.trim())
      ? parentRaw.trim()
      : '';
  const isDuetResponse = Boolean(body.isDuetResponse);
  const location =
    typeof body.location === 'string' ? body.location.trim().slice(0, 200) : '';

  if (!title || !description) {
    res.status(400).json({
      success: false,
      message: 'title and description are required',
      data: null,
    });
    return;
  }

  try {
    await assertTextAllowed(
      [title, description, ...(Array.isArray(body.tags) ? body.tags : [])]
        .map((t) => String(t))
        .join('\n')
    );
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

  if (!CATEGORIES.has(category)) {
    res.status(400).json({
      success: false,
      message: 'Invalid category',
      data: null,
    });
    return;
  }

  if (
    visibility !== 'public' &&
    visibility !== 'private' &&
    visibility !== 'collaborators_only'
  ) {
    res.status(400).json({
      success: false,
      message: 'Invalid visibility',
      data: null,
    });
    return;
  }

  let parentOid: mongoose.Types.ObjectId | null = null;
  if (isDuetResponse) {
    if (!parentIdeaIdStr) {
      res.status(400).json({
        success: false,
        message: 'parentIdeaId is required for a duet response',
        data: null,
      });
      return;
    }
    if (visibility !== 'public') {
      res.status(400).json({
        success: false,
        message: 'Duet responses must be public',
        data: null,
      });
      return;
    }
    const parent = await Idea.findById(parentIdeaIdStr)
      .select('authorId status visibility')
      .lean<{
        authorId: mongoose.Types.ObjectId;
        status: string;
        visibility: string;
      } | null>();
    if (
      !parent ||
      parent.status !== 'published' ||
      parent.visibility !== 'public'
    ) {
      res.status(400).json({
        success: false,
        message: 'Duet parent must be a published public idea',
        data: null,
      });
      return;
    }
    if (String(parent.authorId) === userId) {
      res.status(400).json({
        success: false,
        message: 'You cannot post a duet on your own idea',
        data: null,
      });
      return;
    }
    parentOid = new mongoose.Types.ObjectId(parentIdeaIdStr);
  }

  const tagStrings = tags
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean);
  const skillStrings = requiredSkills
    .map((s) => String(s).trim())
    .filter(Boolean);

  const mediaDocs: Array<Record<string, unknown>> = [];
  for (const item of mediaIn) {
    if (!item || typeof item !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Invalid media item',
        data: null,
      });
      return;
    }
    const m = item as Record<string, unknown>;
    const cdnUrlRaw =
      typeof m.cdnUrl === 'string' ? m.cdnUrl.trim() : '';
    const firebaseUrl =
      typeof m.firebaseUrl === 'string' ? m.firebaseUrl.trim() : '';
    const deliveryUrl = cdnUrlRaw || firebaseUrl;
    const publicId =
      typeof m.publicId === 'string' ? m.publicId.trim() : '';
    const mimeType =
      typeof m.mimeType === 'string' ? m.mimeType.trim() : '';
    const mediaType =
      typeof m.mediaType === 'string' ? m.mediaType.trim() : '';
    if (!deliveryUrl || !mimeType || !MEDIA_TYPES.has(mediaType)) {
      res.status(400).json({
        success: false,
        message:
          'Each media item needs cdnUrl (or legacy firebaseUrl), mimeType, and mediaType',
        data: null,
      });
      return;
    }
    const thumbnailUrl =
      typeof m.thumbnailUrl === 'string' ? m.thumbnailUrl.trim() : '';
    const fileSizeBytes =
      typeof m.fileSizeBytes === 'number' && m.fileSizeBytes >= 0
        ? m.fileSizeBytes
        : 0;
    mediaDocs.push({
      mediaType,
      firebaseUrl: firebaseUrl || '',
      cdnUrl: cdnUrlRaw || firebaseUrl,
      publicId,
      thumbnailUrl,
      fileSizeBytes,
      mimeType,
      durationSeconds: 0,
      scanStatus: 'pending',
      scanViolations: [],
      metadata: {},
    });
  }

  const authorOid = new mongoose.Types.ObjectId(userId);
  const authorUser = await User.findById(authorOid)
    .select('subscription role')
    .lean<{
      subscription?: IUserSubscription | null;
      role?: string;
    } | null>();
  if (!authorUser) {
    res.status(401).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  if (getEffectivePlan(authorUser) === 'free') {
    const n = await Idea.countDocuments({
      authorId: authorOid,
      createdAt: { $gte: startOfUtcMonth() },
    });
    if (n >= FREE_TIER_IDEAS_PER_MONTH) {
      res.status(403).json({
        success: false,
        message: `Free plan allows ${FREE_TIER_IDEAS_PER_MONTH} new ideas per month. Upgrade to Pro for unlimited.`,
        data: null,
      });
      return;
    }
  }

  const wantsScan = Boolean(process.env.REDIS_URL);

  try {
    const idea = await Idea.create({
      authorId: authorOid,
      title,
      description,
      category,
      tags: tagStrings,
      status: 'published',
      visibility,
      contentScanScore: 1,
      media: mediaDocs,
      collaboratorsOpen,
      requiredSkills: skillStrings,
      collaborators: [],
      ...(location ? { location } : {}),
      ...(parentOid
        ? { parentIdeaId: parentOid, isDuetResponse: true }
        : {}),
    });

    await User.updateOne({ _id: authorOid }, { $inc: { totalIdeasPosted: 1 } });

    if (wantsScan) {
      try {
        const { addScanJob } = await import('../../queues/scanner.queue.js');
        const items = idea.media.map((sub) => ({
          mediaId: String(sub._id),
          mediaUrl: String(sub.cdnUrl || sub.firebaseUrl || ''),
          mediaType: sub.mediaType,
          mimeType: sub.mimeType,
        }));
        void addScanJob(idea._id.toString(), items, {
          priority: scanJobPriorityForUser(authorUser),
        }).catch((err) => {
          console.error('[ideas] Scan job failed to queue:', err);
        });
      } catch (err) {
        console.error('[ideas] Scan queue import failed:', err);
      }
    }

    const fresh = await Idea.findById(idea._id);
    if (!fresh) {
      res.status(500).json({
        success: false,
        message: 'Create failed',
        data: null,
      });
      return;
    }

    if (fresh.status === 'published') {
      await createInitialIdeaVersion({
        ideaId: fresh._id as mongoose.Types.ObjectId,
        title: fresh.title,
        description: fresh.description,
        category: String(fresh.category),
        tags: fresh.tags ?? [],
        editedBy: authorOid,
      });
    }

    if (
      String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() ===
        'true' &&
      fresh.status === 'published'
    ) {
      const { scheduleValidationRecalculate } = await import(
        '../../services/ValidationEngine.js'
      );
      scheduleValidationRecalculate(String(fresh._id));
    }

    if (
      String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true' &&
      fresh.status === 'published'
    ) {
      const { onIdeaPublished, onIdeaDuetPublished } = await import(
        '../../services/gamification.service.js'
      );
      void onIdeaPublished(String(userId), fresh.category);
      if (isDuetResponse && parentOid) {
        const parentLean = await Idea.findById(parentOid)
          .select('authorId')
          .lean<{ authorId: mongoose.Types.ObjectId } | null>();
        if (parentLean) {
          void onIdeaDuetPublished(String(userId), String(parentLean.authorId));
        }
      }
    }

    if (
      String(process.env.ENABLE_AI_COACH ?? '').toLowerCase() === 'true' &&
      fresh.status === 'published'
    ) {
      const { scheduleIdeaCoachFeedback } = await import(
        '../../services/AICoachService.js'
      );
      scheduleIdeaCoachFeedback(String(fresh._id));
    }

    const { scheduleIdeaMetadataRefresh } = await import(
      '../../services/idea-metadata.service.js'
    );
    scheduleIdeaMetadataRefresh(String(fresh._id));

    const [createdPayload] = await mapIdeasForPublicApi([fresh], userId);

    res.status(201).json({
      success: true,
      message: 'Created',
      data: createdPayload,
    });
  } catch (err) {
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
      message: 'Create failed',
      data: null,
    });
  }
}
