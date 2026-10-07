import type { Router } from 'express';
import mongoose from 'mongoose';

import { requireAuth } from '../../middleware/require-auth.js';
import { CollabRequest, Idea, Notification, User } from '../../models/index.js';
import type { IUserDocument } from '../../models/User.model.js';
import type { ICollabRequestDocument } from '../../models/CollabRequest.model.js';
import { userToApi } from '../../lib/serialize-user.js';
import { requireDb } from './guards.js';

function collabToApi(
  doc: ICollabRequestDocument,
  requester: IUserDocument
): Record<string, unknown> {
  const respondedAt = doc.respondedAt;
  return {
    _id: String(doc._id),
    ideaId: String(doc.ideaId),
    requesterId: userToApi(requester),
    message: doc.message,
    skillsOffered: doc.skillsOffered ?? [],
    status: doc.status,
    responseMessage: doc.responseMessage ?? '',
    respondedAt:
      respondedAt instanceof Date ? respondedAt.toISOString() : undefined,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ''),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : undefined,
  };
}

export function registerCollabRoutes(ideasRouter: Router): void {
  ideasRouter.post(
    '/:id/collab-request',
    requireDb,
    requireAuth,
    async (req, res) => {
      const { id: ideaId } = req.params;
      const userId = res.locals.authUserId as string | undefined;

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

      const body = req.body as {
        message?: unknown;
        skillsOffered?: unknown;
      };
      const message =
        typeof body.message === 'string' ? body.message.trim() : '';
      const skillsOffered = Array.isArray(body.skillsOffered)
        ? body.skillsOffered
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      if (!message) {
        res.status(400).json({
          success: false,
          message: 'message is required',
          data: null,
        });
        return;
      }

      const ideaOid = new mongoose.Types.ObjectId(ideaId);
      const requesterOid = new mongoose.Types.ObjectId(userId);

      const idea = await Idea.findById(ideaOid)
        .select('authorId status visibility collaboratorsOpen')
        .lean();

      if (!idea) {
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
          message: 'Collaboration is only available on published ideas',
          data: null,
        });
        return;
      }

      if (!idea.collaboratorsOpen) {
        res.status(400).json({
          success: false,
          message: 'This idea is not open for collaborators',
          data: null,
        });
        return;
      }

      if (String(idea.authorId) === userId) {
        res.status(400).json({
          success: false,
          message: 'You cannot request to collaborate on your own idea',
          data: null,
        });
        return;
      }

      try {
        const created = await CollabRequest.create({
          ideaId: ideaOid,
          requesterId: requesterOid,
          message,
          skillsOffered,
          status: 'pending',
        });

        const populated = await CollabRequest.findById(created._id);
        const requester = await User.findById(requesterOid);
        if (!populated || !requester) {
          res.status(500).json({
            success: false,
            message: 'Failed to create collaboration request',
            data: null,
          });
          return;
        }

        const ideaTitle = await Idea.findById(ideaOid).select('title').lean();
        const title = (ideaTitle?.title as string | undefined)?.slice(0, 80) ?? 'your idea';

        await Notification.create({
          recipientId: new mongoose.Types.ObjectId(String(idea.authorId)),
          senderId: requesterOid,
          type: 'collab_request',
          referenceId: ideaOid,
          referenceType: 'idea',
          title: 'New collaboration request',
          body: `${requester.username} wants to collaborate on “${title}”.`.slice(
            0,
            500
          ),
          isRead: false,
          isPushSent: false,
          metadata: { collabRequestId: String(created._id) },
        });

        res.status(201).json({
          success: true,
          message: 'OK',
          data: collabToApi(populated, requester),
        });
      } catch (err) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? (err as { code: number }).code
            : undefined;
        if (code === 11000) {
          res.status(409).json({
            success: false,
            message: 'You already have a collaboration request for this idea',
            data: null,
          });
          return;
        }
        console.error(err);
        res.status(500).json({
          success: false,
          message: 'Failed to send collaboration request',
          data: null,
        });
      }
    }
  );

  ideasRouter.get(
    '/:id/collab-requests',
    requireDb,
    requireAuth,
    async (req, res) => {
      const { id: ideaId } = req.params;
      const userId = res.locals.authUserId as string | undefined;

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

      const idea = await Idea.findById(ideaId).select('authorId').lean();
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
          message: 'Only the idea author can view collaboration requests',
          data: null,
        });
        return;
      }

      const rows = await CollabRequest.find({ ideaId })
        .sort({ createdAt: -1 })
        .lean();

      const requesterIds = [...new Set(rows.map((r) => String(r.requesterId)))];
      const users = await User.find({
        _id: { $in: requesterIds.map((id) => new mongoose.Types.ObjectId(id)) },
      });
      const byId = new Map(users.map((u) => [String(u._id), u]));

      const data = rows.map((r) => {
        const u = byId.get(String(r.requesterId));
        if (!u) {
          return null;
        }
        return collabToApi(r as unknown as ICollabRequestDocument, u);
      });

      res.json({
        success: true,
        message: 'OK',
        data: data.filter(Boolean),
      });
    }
  );

  ideasRouter.patch(
    '/:id/collab-requests/:reqId',
    requireDb,
    requireAuth,
    async (req, res) => {
      const { id: ideaId, reqId } = req.params;
      const userId = res.locals.authUserId as string | undefined;

      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        res.status(401).json({
          success: false,
          message: 'Invalid session',
          data: null,
        });
        return;
      }

      if (
        !mongoose.Types.ObjectId.isValid(ideaId) ||
        !mongoose.Types.ObjectId.isValid(reqId)
      ) {
        res.status(400).json({
          success: false,
          message: 'Invalid id',
          data: null,
        });
        return;
      }

      const body = req.body as {
        status?: unknown;
        responseMessage?: unknown;
      };
      const status =
        body.status === 'accepted' || body.status === 'rejected'
          ? body.status
          : null;
      const responseMessage =
        typeof body.responseMessage === 'string' ? body.responseMessage.trim() : '';

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'status must be accepted or rejected',
          data: null,
        });
        return;
      }

      const idea = await Idea.findById(ideaId);
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
          message: 'Only the idea author can respond to collaboration requests',
          data: null,
        });
        return;
      }

      const request = await CollabRequest.findOne({
        _id: reqId,
        ideaId,
      });

      if (!request) {
        res.status(404).json({
          success: false,
          message: 'Collaboration request not found',
          data: null,
        });
        return;
      }

      if (request.status !== 'pending') {
        res.status(400).json({
          success: false,
          message: 'This request has already been responded to',
          data: null,
        });
        return;
      }

      request.status = status;
      request.responseMessage = responseMessage;
      request.respondedAt = new Date();

      if (status === 'accepted') {
        const requesterOid = request.requesterId as mongoose.Types.ObjectId;
        const has = (idea.collaborators ?? []).some(
          (c) => String(c.userId) === String(requesterOid)
        );
        if (!has) {
          idea.collaborators = idea.collaborators ?? [];
          idea.collaborators.push({
            userId: requesterOid,
            role: 'contributor',
            joinedAt: new Date(),
          });
          await idea.save();
        }
      }

      await request.save();

      const requester = await User.findById(request.requesterId);
      if (!requester) {
        res.status(500).json({
          success: false,
          message: 'Failed to load user',
          data: null,
        });
        return;
      }

      const ideaTitleShort = String(idea.title).slice(0, 80);
      if (status === 'accepted') {
        await Notification.create({
          recipientId: request.requesterId as mongoose.Types.ObjectId,
          senderId: new mongoose.Types.ObjectId(userId),
          type: 'collab_accepted',
          referenceId: idea._id,
          referenceType: 'idea',
          title: 'Collaboration request accepted',
          body: `Your collaboration request for “${ideaTitleShort}” was accepted.`.slice(
            0,
            500
          ),
          isRead: false,
          isPushSent: false,
          metadata: {},
        });
      } else {
        await Notification.create({
          recipientId: request.requesterId as mongoose.Types.ObjectId,
          senderId: new mongoose.Types.ObjectId(userId),
          type: 'system_message',
          referenceId: idea._id,
          referenceType: 'idea',
          title: 'Collaboration request declined',
          body: `Your collaboration request for “${ideaTitleShort}” was declined.`.slice(
            0,
            500
          ),
          isRead: false,
          isPushSent: false,
          metadata: {},
        });
      }

      const fresh = await CollabRequest.findById(request._id);
      if (!fresh) {
        res.status(500).json({
          success: false,
          message: 'Failed to load request',
          data: null,
        });
        return;
      }

      res.json({
        success: true,
        message: 'OK',
        data: collabToApi(fresh, requester),
      });
    }
  );
}
