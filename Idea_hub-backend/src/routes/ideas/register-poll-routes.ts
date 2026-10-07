import type { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../../middleware/require-auth.js';
import {
  IDEA_POLL_OPTION_KEYS,
  isPollOptionKey,
} from '../../models/IdeaPollVote.model.js';
import { Idea, IdeaPollVote } from '../../models/index.js';
import { mapIdeasForPublicApi } from './map-public.js';
import { requireDb } from './guards.js';

export function registerPollRoutes(ideasRouter: Router): void {
  ideasRouter.patch('/:id/poll', requireDb, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = res.locals.authUserId;
    if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid request',
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
        message: 'Poll is only available on published ideas',
        data: null,
      });
      return;
    }

    const body = req.body as { enabled?: unknown; question?: unknown };
    if (typeof body.enabled === 'boolean') {
      idea.set('poll.enabled', body.enabled);
    }
    if (typeof body.question === 'string') {
      idea.set('poll.question', body.question.trim().slice(0, 280));
    }
    await idea.save();

    const fresh = await Idea.findById(id);
    if (!fresh) {
      res.status(500).json({
        success: false,
        message: 'Save failed',
        data: null,
      });
      return;
    }
    const [payload] = await mapIdeasForPublicApi([fresh], userId);
    res.json({ success: true, message: 'OK', data: payload });
  });

  ideasRouter.post('/:id/poll/vote', requireDb, requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = res.locals.authUserId;
    const body = req.body as { optionKey?: unknown };
    const optionKey =
      typeof body.optionKey === 'string' ? body.optionKey.trim() : '';

    if (
      !userId ||
      !mongoose.Types.ObjectId.isValid(id) ||
      !isPollOptionKey(optionKey)
    ) {
      res.status(400).json({
        success: false,
        message: `optionKey must be one of: ${IDEA_POLL_OPTION_KEYS.join(', ')}`,
        data: null,
      });
      return;
    }

    const ideaOid = new mongoose.Types.ObjectId(id);
    const userOid = new mongoose.Types.ObjectId(userId);

    const idea = await Idea.findById(ideaOid);
    if (!idea || idea.status !== 'published') {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }
    const poll = idea.poll as { enabled?: boolean } | undefined;
    if (!poll?.enabled) {
      res.status(400).json({
        success: false,
        message: 'This idea has no active poll',
        data: null,
      });
      return;
    }

    const prev = await IdeaPollVote.findOne({
      ideaId: ideaOid,
      userId: userOid,
    });

    if (prev && prev.optionKey === optionKey) {
      const [payload] = await mapIdeasForPublicApi([idea], userId);
      res.json({ success: true, message: 'OK', data: payload });
      return;
    }

    const inc: Record<string, number> = {};
    if (prev) {
      inc[`poll.counts.${prev.optionKey}`] = -1;
    }
    inc[`poll.counts.${optionKey}`] = (inc[`poll.counts.${optionKey}`] ?? 0) + 1;

    try {
      if (prev) {
        prev.optionKey = optionKey as (typeof prev)['optionKey'];
        await prev.save();
      } else {
        await IdeaPollVote.create({
          ideaId: ideaOid,
          userId: userOid,
          optionKey,
        });
      }
      await Idea.updateOne({ _id: ideaOid }, { $inc: inc });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Vote failed',
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

    const fresh = await Idea.findById(ideaOid);
    if (!fresh) {
      res.status(500).json({
        success: false,
        message: 'Vote failed',
        data: null,
      });
      return;
    }
    const [payload] = await mapIdeasForPublicApi([fresh], userId);
    res.json({ success: true, message: 'OK', data: payload });
  });
}
