import type { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../../middleware/require-auth.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { Idea } from '../../models/index.js';
import { purgeIdea } from '../../services/admin-purge.service.js';
import { recordBehaviorAndUpdateProfile } from '../../services/interest-profile.service.js';
import { mapIdeasForPublicApi } from './map-public.js';
import { requireDb } from './guards.js';

function canViewIdea(
  idea: { authorId: mongoose.Types.ObjectId; visibility: string; collaborators: Array<{ userId: mongoose.Types.ObjectId }> },
  viewerId?: string | null
): boolean {
  if (idea.visibility === 'public') return true;
  if (!viewerId) return false;
  if (String(idea.authorId) === viewerId) return true;
  if (idea.visibility === 'collaborators_only') {
    return idea.collaborators.some((c) => String(c.userId) === viewerId);
  }
  return false;
}

export function registerEngagementRoutes(ideasRouter: Router): void {
  ideasRouter.post(
    '/:id/view',
    requireDb,
    optionalAuth,
    async (req, res) => {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid idea id',
          data: null,
        });
        return;
      }

      const idea = await Idea.findById(id)
        .select('status visibility authorId collaborators')
        .lean<{
          status: string;
          visibility: string;
          authorId: mongoose.Types.ObjectId;
          collaborators: Array<{ userId: mongoose.Types.ObjectId }>;
        } | null>();

      if (!idea || idea.status !== 'published') {
        res.status(404).json({
          success: false,
          message: 'Idea not found',
          data: null,
        });
        return;
      }

      const viewer = res.locals.authUserId as string | undefined;
      if (!canViewIdea(idea, viewer ?? null)) {
        res.status(404).json({
          success: false,
          message: 'Idea not found',
          data: null,
        });
        return;
      }

      await Idea.updateOne({ _id: id }, { $inc: { viewCount: 1 } });

      if (viewer && mongoose.Types.ObjectId.isValid(viewer)) {
        const body = req.body as { sessionId?: unknown; source?: unknown };
        const sessionId =
          typeof body.sessionId === 'string' && body.sessionId.length >= 8
            ? body.sessionId.slice(0, 200)
            : `view-${id}-${Date.now()}`;
        const sourceRaw =
          typeof body.source === 'string' ? body.source.trim() : 'feed';
        const source = ['feed', 'search', 'profile', 'notification', 'trending'].includes(
          sourceRaw
        )
          ? (sourceRaw as 'feed' | 'search' | 'profile' | 'notification' | 'trending')
          : 'feed';

        void recordBehaviorAndUpdateProfile({
          userId: new mongoose.Types.ObjectId(viewer),
          eventType: 'view',
          ideaId: new mongoose.Types.ObjectId(id),
          sessionId,
          source,
          deviceType: 'desktop',
        }).catch((err) => console.warn('[ideas] view behavior', err));
      }

      const fresh = await Idea.findById(id).select('viewCount').lean();
      res.json({
        success: true,
        message: 'OK',
        data: { viewCount: fresh?.viewCount ?? 0 },
      });
    }
  );

  ideasRouter.post('/:id/share', requireDb, requireAuth, async (req, res) => {
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

    const idea = await Idea.findById(id)
      .select('status visibility authorId collaborators')
      .lean<{
        status: string;
        visibility: string;
        authorId: mongoose.Types.ObjectId;
        collaborators: Array<{ userId: mongoose.Types.ObjectId }>;
      } | null>();

    if (!idea || idea.status !== 'published') {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    if (!canViewIdea(idea, userId)) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    await Idea.updateOne({ _id: id }, { $inc: { shareCount: 1 } });

    const body = req.body as { sessionId?: unknown; source?: unknown };
    const sessionId =
      typeof body.sessionId === 'string' && body.sessionId.length >= 8
        ? body.sessionId.slice(0, 200)
        : `share-${id}-${userId}-${Date.now()}`;
    const sourceRaw =
      typeof body.source === 'string' ? body.source.trim() : 'feed';
    const source = ['feed', 'search', 'profile', 'notification', 'trending'].includes(
      sourceRaw
    )
      ? (sourceRaw as 'feed' | 'search' | 'profile' | 'notification' | 'trending')
      : 'feed';

    void recordBehaviorAndUpdateProfile({
      userId: new mongoose.Types.ObjectId(userId),
      eventType: 'share',
      ideaId: new mongoose.Types.ObjectId(id),
      sessionId,
      source,
      deviceType: 'desktop',
    }).catch((err) => console.warn('[ideas] share behavior', err));

    const fresh = await Idea.findById(id);
    if (!fresh) {
      res.status(500).json({
        success: false,
        message: 'Share failed',
        data: null,
      });
      return;
    }

    const [payload] = await mapIdeasForPublicApi([fresh], userId);
    res.json({
      success: true,
      message: 'Shared',
      data: payload,
    });
  });

  ideasRouter.delete('/:id', requireDb, requireAuth, async (req, res) => {
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

    const idea = await Idea.findById(id).select('authorId').lean<{
      authorId: mongoose.Types.ObjectId;
    } | null>();

    if (!idea || String(idea.authorId) !== userId) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    try {
      await purgeIdea(new mongoose.Types.ObjectId(id));
      const { User } = await import('../../models/index.js');
      await User.updateOne(
        { _id: userId, totalIdeasPosted: { $gt: 0 } },
        { $inc: { totalIdeasPosted: -1 } }
      );
      res.json({
        success: true,
        message: 'Deleted',
        data: null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Delete failed',
        data: null,
      });
    }
  });
}
