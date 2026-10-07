import type { Router } from 'express';
import mongoose from 'mongoose';

import {
  diffIdeaVersions,
  ensurePublishedIdeaHasVersionHistory,
  loadIdeaVersionLean,
} from '../../lib/idea-versioning.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { Idea, IdeaVersion } from '../../models/index.js';
import type { IIdeaVersion } from '../../models/IdeaVersion.model.js';
import { requireDb } from './guards.js';

export function registerVersionRoutes(ideasRouter: Router): void {
  ideasRouter.get('/:id/versions', requireDb, optionalAuth, async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid idea id',
        data: null,
      });
      return;
    }
    const ideaExists = await Idea.exists({ _id: id });
    if (!ideaExists) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    await ensurePublishedIdeaHasVersionHistory(id);

    const rows = await IdeaVersion.find({ ideaId: id })
      .sort({ versionNumber: -1 })
      .limit(80)
      .lean<IIdeaVersion[]>();

    res.json({
      success: true,
      message: 'OK',
      data: rows.map((r: IIdeaVersion) => ({
        versionNumber: r.versionNumber,
        title: r.title,
        description: r.description,
        category: r.category,
        tags: r.tags ?? [],
        editedBy: String(r.editedBy),
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt ?? ''),
      })),
    });
  });

  ideasRouter.get(
    '/:id/versions/diff',
    requireDb,
    optionalAuth,
    async (req, res) => {
      const { id } = req.params;
      const fromRaw =
        typeof req.query.from === 'string' ? req.query.from.trim() : '';
      const toRaw = typeof req.query.to === 'string' ? req.query.to.trim() : '';
      const fromV = Number(fromRaw);
      const toV = Number(toRaw);
      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        !Number.isFinite(fromV) ||
        !Number.isFinite(toV) ||
        fromV < 1 ||
        toV < 1
      ) {
        res.status(400).json({
          success: false,
          message: 'Valid idea id and numeric from/to version are required',
          data: null,
        });
        return;
      }

      const ideaExists = await Idea.exists({ _id: id });
      if (!ideaExists) {
        res.status(404).json({
          success: false,
          message: 'Idea not found',
          data: null,
        });
        return;
      }

      await ensurePublishedIdeaHasVersionHistory(id);

      const a = await loadIdeaVersionLean(id, fromV);
      const b = await loadIdeaVersionLean(id, toV);
      if (!a || !b) {
        res.status(404).json({
          success: false,
          message: 'One or both versions were not found',
          data: null,
        });
        return;
      }

      res.json({
        success: true,
        message: 'OK',
        data: diffIdeaVersions(a, b),
      });
    }
  );
}
