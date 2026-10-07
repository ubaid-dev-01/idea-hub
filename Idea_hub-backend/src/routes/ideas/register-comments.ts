import type { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../../middleware/require-auth.js';
import { Comment, Idea } from '../../models/index.js';
import { COMMENTS_PAGE } from './constants.js';
import type { LeanComment } from './comment-types.js';
import { authorMapForIds } from './author-utils.js';
import { leanCommentToApi } from './comment-serialize.js';
import { requireDb } from './guards.js';

export function registerCommentRoutes(ideasRouter: Router): void {
  ideasRouter.get('/:id/comments', requireDb, async (req, res) => {
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

    const rootFilter: Record<string, unknown> = {
      ideaId: new mongoose.Types.ObjectId(ideaId),
      parentCommentId: null,
      status: 'visible',
    };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      rootFilter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    const rootsRaw = await Comment.find(rootFilter)
      .sort({ _id: 1 })
      .limit(COMMENTS_PAGE + 1)
      .lean<LeanComment[]>();

    const hasMore = rootsRaw.length > COMMENTS_PAGE;
    const roots = hasMore
      ? rootsRaw.slice(0, COMMENTS_PAGE)
      : rootsRaw;

    const rootIds = roots.map((r) => r._id);
    const repliesRaw =
      rootIds.length > 0
        ? await Comment.find({
            ideaId: new mongoose.Types.ObjectId(ideaId),
            parentCommentId: { $in: rootIds },
            status: 'visible',
          })
            .sort({ createdAt: 1 })
            .lean<LeanComment[]>()
        : [];

    const repliesByParent = new Map<string, LeanComment[]>();
    for (const rep of repliesRaw) {
      if (!rep.parentCommentId) continue;
      const pid = String(rep.parentCommentId);
      const arr = repliesByParent.get(pid) ?? [];
      arr.push(rep);
      repliesByParent.set(pid, arr);
    }

    const authorIds = new Set<string>();
    for (const r of roots) authorIds.add(String(r.authorId));
    for (const r of repliesRaw) authorIds.add(String(r.authorId));
    const authors = await authorMapForIds([...authorIds]);

    const comments = roots.map((root) => {
      const out = leanCommentToApi(root, authors);
      const children = repliesByParent.get(String(root._id)) ?? [];
      if (children.length > 0) {
        out.replies = children.map((ch) => leanCommentToApi(ch, authors));
      }
      return out;
    });

    const nextCursor =
      hasMore && roots.length > 0
        ? String(roots[roots.length - 1]!._id)
        : undefined;

    res.json({
      success: true,
      message: 'OK',
      data: comments,
      meta: {
        nextCursor,
        hasMore: Boolean(nextCursor),
      },
    });
  });

  ideasRouter.post('/:id/comments', requireDb, requireAuth, async (req, res) => {
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

    const ideaExists = await Idea.exists({ _id: ideaId });
    if (!ideaExists) {
      res.status(404).json({
        success: false,
        message: 'Idea not found',
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const content =
      typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      res.status(400).json({
        success: false,
        message: 'Comment content is required',
        data: null,
      });
      return;
    }

    let parentOid: mongoose.Types.ObjectId | null = null;
    const rawParent = body.parentCommentId;
    if (rawParent != null && rawParent !== '') {
      const pid = String(rawParent);
      if (!mongoose.Types.ObjectId.isValid(pid)) {
        res.status(400).json({
          success: false,
          message: 'Invalid parent comment',
          data: null,
        });
        return;
      }
      const parent = await Comment.findById(pid)
        .select('ideaId parentCommentId')
        .lean<{ ideaId: mongoose.Types.ObjectId; parentCommentId: unknown } | null>();
      if (!parent || String(parent.ideaId) !== ideaId) {
        res.status(400).json({
          success: false,
          message: 'Parent comment not found',
          data: null,
        });
        return;
      }
      if (parent.parentCommentId) {
        res.status(400).json({
          success: false,
          message: 'Cannot reply to a reply',
          data: null,
        });
        return;
      }
      parentOid = new mongoose.Types.ObjectId(pid);
    }

    try {
      const doc = await Comment.create({
        ideaId: new mongoose.Types.ObjectId(ideaId),
        authorId: new mongoose.Types.ObjectId(userId),
        parentCommentId: parentOid,
        content,
      });

      const lean = doc.toObject() as unknown as LeanComment;
      const authors = await authorMapForIds([String(lean.authorId)]);

      res.status(201).json({
        success: true,
        message: 'Created',
        data: leanCommentToApi(lean, authors),
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Threading limited')) {
        res.status(400).json({
          success: false,
          message: err.message,
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
        message: 'Comment failed',
        data: null,
      });
    }
  });

  ideasRouter.patch(
    '/:id/comments/:commentId',
    requireDb,
    requireAuth,
    async (req, res) => {
      const { id: ideaId, commentId } = req.params;
      const userId = res.locals.authUserId;

      if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(ideaId) ||
        !mongoose.Types.ObjectId.isValid(commentId)
      ) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          data: null,
        });
        return;
      }

      const comment = await Comment.findById(commentId);
      if (
        !comment ||
        String(comment.ideaId) !== ideaId ||
        String(comment.authorId) !== userId
      ) {
        res.status(404).json({
          success: false,
          message: 'Comment not found',
          data: null,
        });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const content =
        typeof body.content === 'string' ? body.content.trim() : '';
      if (!content) {
        res.status(400).json({
          success: false,
          message: 'Comment content is required',
          data: null,
        });
        return;
      }

      comment.content = content;
      comment.isEdited = true;
      comment.editedAt = new Date();
      await comment.save();

      const lean = comment.toObject() as unknown as LeanComment;
      const authors = await authorMapForIds([String(lean.authorId)]);
      res.json({
        success: true,
        message: 'OK',
        data: leanCommentToApi(lean, authors),
      });
    }
  );

  ideasRouter.delete(
    '/:id/comments/:commentId',
    requireDb,
    requireAuth,
    async (req, res) => {
      const { id: ideaId, commentId } = req.params;
      const userId = res.locals.authUserId;

      if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(ideaId) ||
        !mongoose.Types.ObjectId.isValid(commentId)
      ) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          data: null,
        });
        return;
      }

      const comment = await Comment.findById(commentId);
      if (
        !comment ||
        String(comment.ideaId) !== ideaId ||
        String(comment.authorId) !== userId
      ) {
        res.status(404).json({
          success: false,
          message: 'Comment not found',
          data: null,
        });
        return;
      }

      await Comment.deleteOne({ _id: commentId });
      await Idea.updateOne(
        { _id: ideaId, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } }
      );

      res.json({
        success: true,
        message: 'Deleted',
        data: null,
      });
    }
  );
}
