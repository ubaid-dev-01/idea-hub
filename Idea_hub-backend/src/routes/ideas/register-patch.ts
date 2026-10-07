import type { Router } from 'express';
import mongoose from 'mongoose';

import {
  appendIdeaVersionSnapshot,
} from '../../lib/idea-versioning.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { Idea, User } from '../../models/index.js';
import { CATEGORIES } from './constants.js';
import { mapIdeasForPublicApi } from './map-public.js';
import { notifyFollowersOfIdeaVersion } from './notify-version.js';
import { requireDb } from './guards.js';

function tagsEqual(a: string[], b: string[]): boolean {
  const x = [...a].map((t) => t.toLowerCase()).sort().join('\0');
  const y = [...b].map((t) => t.toLowerCase()).sort().join('\0');
  return x === y;
}

export function registerPatchRoute(ideasRouter: Router): void {
  ideasRouter.patch('/:id', requireDb, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = res.locals.authUserId;
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
        message: 'Invalid idea id',
        data: null,
      });
      return;
    }

    const idea = await Idea.findById(id);
    if (!idea || String(idea.authorId) !== userId) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    if (idea.status !== 'published') {
      res.status(400).json({
        success: false,
        message: 'Only published ideas can be updated from the app',
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    let contentChanged = false;

    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (t && t !== idea.title) {
        idea.title = t;
        contentChanged = true;
      }
    }
    if (typeof body.description === 'string') {
      const d = body.description.trim();
      if (d && d !== idea.description) {
        idea.description = d;
        contentChanged = true;
      }
    }
    if (Array.isArray(body.tags)) {
      const nextTags = body.tags
        .map((t) => String(t).trim().toLowerCase())
        .filter(Boolean);
      if (!tagsEqual(nextTags, idea.tags ?? [])) {
        idea.tags = nextTags;
        contentChanged = true;
      }
    }
    if (typeof body.category === 'string') {
      const c = body.category.trim();
      if (CATEGORIES.has(c) && c !== idea.category) {
        idea.set('category', c);
        contentChanged = true;
      }
    }

    if (
      body.visibility === 'public' ||
      body.visibility === 'private' ||
      body.visibility === 'collaborators_only'
    ) {
      idea.visibility = body.visibility;
    }
    if (typeof body.collaboratorsOpen === 'boolean') {
      idea.collaboratorsOpen = body.collaboratorsOpen;
    }
    if (Array.isArray(body.requiredSkills)) {
      idea.requiredSkills = body.requiredSkills
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 30);
    }
    if (typeof body.location === 'string') {
      idea.location = body.location.trim().slice(0, 200);
    }

    try {
      if (contentChanged) {
        const nextV = (idea.version ?? 1) + 1;
        idea.version = nextV;
        await idea.save();
        await appendIdeaVersionSnapshot({
          ideaId: idea._id as mongoose.Types.ObjectId,
          nextVersionNumber: nextV,
          title: idea.title,
          description: idea.description,
          category: String(idea.category),
          tags: idea.tags ?? [],
          editedBy: new mongoose.Types.ObjectId(userId),
        });
        const authorUser = await User.findById(userId)
          .select('fullName username')
          .lean<{ fullName?: string; username?: string } | null>();
        const authorDisplay =
          authorUser?.fullName?.trim() ||
          authorUser?.username ||
          'Someone';
        await notifyFollowersOfIdeaVersion({
          ideaId: idea._id as mongoose.Types.ObjectId,
          authorId: idea.authorId as mongoose.Types.ObjectId,
          authorDisplay,
          ideaTitle: idea.title,
          version: nextV,
        });
      } else {
        await idea.save();
      }
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
        message: 'Update failed',
        data: null,
      });
      return;
    }

    if (
      String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() ===
      'true'
    ) {
      const { scheduleValidationRecalculate } = await import(
        '../../services/ValidationEngine.js'
      );
      scheduleValidationRecalculate(id);
    }

    if (contentChanged) {
      const { scheduleIdeaMetadataRefresh } = await import(
        '../../services/idea-metadata.service.js'
      );
      scheduleIdeaMetadataRefresh(id);
    }

    const fresh = await Idea.findById(id);
    if (!fresh) {
      res.status(500).json({
        success: false,
        message: 'Update failed',
        data: null,
      });
      return;
    }
    const [payload] = await mapIdeasForPublicApi([fresh], userId);
    res.json({
      success: true,
      message: 'OK',
      data: payload,
    });
  });
}
