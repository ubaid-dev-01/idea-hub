import type { Router } from 'express';
import mongoose from 'mongoose';

import {
  attachAiCoachForAuthor,
  ideaToApi,
} from '../../lib/serialize-idea.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { Idea } from '../../models/index.js';
import { requireDb } from './guards.js';

export function registerValidationRecalcRoute(ideasRouter: Router): void {
  ideasRouter.post(
    '/:id/validation/recalculate',
    requireDb,
    requireAuth,
    async (req, res) => {
      if (
        String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() !==
        'true'
      ) {
        res.status(404).json({
          success: false,
          message: 'Validation engine disabled',
          data: null,
        });
        return;
      }

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

      const idea = await Idea.findById(id).select('authorId status').lean();
      if (!idea) {
        res.status(404).json({
          success: false,
          message: 'Idea not found',
          data: null,
        });
        return;
      }

      if (String(idea.authorId) !== userId) {
        res.status(403).json({
          success: false,
          message: 'Only the author can recalculate validation',
          data: null,
        });
        return;
      }

      if (idea.status !== 'published') {
        res.status(400).json({
          success: false,
          message: 'Only published ideas have a viability score',
          data: null,
        });
        return;
      }

      try {
        const { calculateScore } = await import(
          '../../services/ValidationEngine.js'
        );
        const score = await calculateScore(id, { forceAi: true });
        const fresh = await Idea.findById(id);
        if (!fresh) {
          res.status(500).json({
            success: false,
            message: 'Recalculate failed',
            data: null,
          });
          return;
        }
        const ideaPayload = ideaToApi(fresh);
        attachAiCoachForAuthor(fresh, ideaPayload, userId);
        res.json({
          success: true,
          message: 'OK',
          data: {
            validationScore: score,
            idea: ideaPayload,
          },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({
          success: false,
          message: 'Recalculate failed',
          data: null,
        });
      }
    }
  );
}
