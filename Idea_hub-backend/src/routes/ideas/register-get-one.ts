import type { Router } from 'express';
import mongoose from 'mongoose';

import { optionalAuth } from '../../middleware/optional-auth.js';
import { Idea } from '../../models/index.js';
import { mapIdeasForPublicApi } from './map-public.js';
import { requireDb } from './guards.js';

function canViewIdea(
  idea: {
    authorId: mongoose.Types.ObjectId;
    status: string;
    visibility: string;
    collaborators: Array<{ userId: mongoose.Types.ObjectId }>;
  },
  viewerId?: string | null
): boolean {
  if (idea.status !== 'published' && idea.status !== 'flagged') {
    if (!viewerId || String(idea.authorId) !== viewerId) return false;
  }
  if (idea.visibility === 'public') return true;
  if (!viewerId) return false;
  if (String(idea.authorId) === viewerId) return true;
  if (idea.visibility === 'collaborators_only') {
    return idea.collaborators.some((c) => String(c.userId) === viewerId);
  }
  return false;
}

export function registerGetOneRoute(ideasRouter: Router): void {
  ideasRouter.get('/:id', requireDb, optionalAuth, async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid idea id',
        data: null,
      });
      return;
    }
    const idea = await Idea.findById(id);
    if (!idea) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }
    const viewer = res.locals.authUserId as string | undefined;
    if (
      !canViewIdea(
        {
          authorId: idea.authorId as mongoose.Types.ObjectId,
          status: String(idea.status),
          visibility: String(idea.visibility),
          collaborators: (idea.collaborators ?? []) as Array<{
            userId: mongoose.Types.ObjectId;
          }>,
        },
        viewer ?? null
      )
    ) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }
    const [payload] = await mapIdeasForPublicApi([idea], viewer ?? null);
    res.json({
      success: true,
      message: 'OK',
      data: payload,
    });
  });
}
