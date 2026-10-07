import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import { ideaToApi } from '../lib/serialize-idea.js';
import { userToApi } from '../lib/serialize-user.js';
import { requireAuth } from '../middleware/require-auth.js';
import { requireStaff } from '../middleware/require-staff.js';
import type { IIdeaDocument } from '../models/Idea.model.js';
import type { IUserDocument } from '../models/User.model.js';
import { AdminAuditLog, Comment, Idea, User } from '../models/index.js';
import {
  countSuperAdmins,
  purgeIdea,
  purgeUser,
} from '../services/admin-purge.service.js';
import { getAdminDashboardStats } from '../services/admin-dashboard.service.js';

export const adminRouter = Router();

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

const PAGE = 30;

function parseOptionalIsoDate(v: unknown): Date | undefined {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

adminRouter.use(requireDb);
adminRouter.use(requireAuth);
adminRouter.use(requireStaff);

/** Staff self-service: name, username, password (email login unchanged). */
adminRouter.patch('/me', async (req, res) => {
  const userId = res.locals.authUserId as string | undefined;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const body = req.body as {
    fullName?: unknown;
    username?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }

  if (typeof body.newPassword === 'string' && body.newPassword.length > 0) {
    if (typeof body.currentPassword !== 'string' || !body.currentPassword) {
      res.status(400).json({
        success: false,
        message: 'currentPassword is required to set a new password',
        data: null,
      });
      return;
    }
    const ok = await user.comparePassword(body.currentPassword);
    if (!ok) {
      res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
        data: null,
      });
      return;
    }
    if (body.newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
        data: null,
      });
      return;
    }
    user.passwordHash = body.newPassword;
  }

  if (typeof body.username === 'string' && body.username.trim()) {
    const next = body.username.trim().toLowerCase();
    if (next !== user.username) {
      const taken = await User.findOne({
        username: next,
        _id: { $ne: user._id },
      })
        .select('_id')
        .lean();
      if (taken) {
        res.status(409).json({
          success: false,
          message: 'That username is already taken',
          data: null,
        });
        return;
      }
      user.username = next;
    }
  }

  if (typeof body.fullName === 'string') {
    const fn = body.fullName.trim();
    if (!fn) {
      res.status(400).json({
        success: false,
        message: 'fullName cannot be empty',
        data: null,
      });
      return;
    }
    if (fn.length > 120) {
      res.status(400).json({
        success: false,
        message: 'fullName too long',
        data: null,
      });
      return;
    }
    user.fullName = fn;
  }

  if (!user.isModified()) {
    const fresh = await User.findById(user._id);
    res.json({
      success: true,
      message: 'OK',
      data: userToApi(fresh!),
    });
    return;
  }

  try {
    await user.save();
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Username already in use',
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
    throw err;
  }

  const fresh = await User.findById(user._id);
  res.json({
    success: true,
    message: 'OK',
    data: userToApi(fresh!),
  });
});

/** Create another super_admin (super_admin only). */
adminRouter.post('/super-admins', async (req, res) => {
  const actorId = res.locals.authUserId as string | undefined;
  if (!actorId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      data: null,
    });
    return;
  }
  const actor = await User.findById(actorId).select('role').lean();
  if (!actor || actor.role !== 'super_admin') {
    res.status(403).json({
      success: false,
      message: 'Only super admins can create super admins',
      data: null,
    });
    return;
  }

  const { email, password, username, fullName } = req.body as Record<
    string,
    unknown
  >;
  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof username !== 'string' ||
    typeof fullName !== 'string'
  ) {
    res.status(400).json({
      success: false,
      message: 'email, password, username, and fullName are required',
      data: null,
    });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters',
      data: null,
    });
    return;
  }

  try {
    const created = await User.create({
      email: email.trim().toLowerCase(),
      username: username.trim().toLowerCase(),
      passwordHash: password,
      fullName: fullName.trim(),
      role: 'super_admin',
      status: 'active',
      isEmailVerified: true,
    });
    res.status(201).json({
      success: true,
      message: 'Super admin created',
      data: userToApi(created),
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      const key = (err as { keyPattern?: Record<string, number> }).keyPattern;
      const field = key ? Object.keys(key)[0] : 'field';
      res.status(409).json({
        success: false,
        message:
          field === 'email'
            ? 'That email is already registered'
            : field === 'username'
              ? 'That username is taken'
              : 'Email or username already in use',
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
    throw err;
  }
});

adminRouter.get('/dashboard/stats', async (_req, res) => {
  try {
    const data = await getAdminDashboardStats();
    res.json({
      success: true,
      message: 'OK',
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard stats',
      data: null,
    });
  }
});

adminRouter.get('/users', async (req, res) => {
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const role =
    typeof req.query.role === 'string' ? req.query.role.trim() : '';
  const status =
    typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const from = parseOptionalIsoDate(req.query.from);
  const to = parseOptionalIsoDate(req.query.to);

  const filter: Record<string, unknown> = {};
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  if (role) {
    filter.role = role;
  }
  if (status) {
    filter.status = status;
  }
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    filter.createdAt = range;
  }
  const docs = await User.find(filter)
    .sort({ _id: -1 })
    .limit(PAGE + 1);
  const hasMore = docs.length > PAGE;
  const page = hasMore ? docs.slice(0, PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;
  res.json({
    success: true,
    message: 'OK',
    data: page.map((u) => userToApi(u)),
    meta: { nextCursor, hasMore: Boolean(nextCursor) },
  });
});

adminRouter.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as { fullName?: unknown; bio?: unknown };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid user id',
      data: null,
    });
    return;
  }
  const updates: Record<string, string> = {};
  if (typeof body.fullName === 'string' && body.fullName.trim()) {
    const fn = body.fullName.trim();
    if (fn.length > 120) {
      res.status(400).json({
        success: false,
        message: 'fullName too long',
        data: null,
      });
      return;
    }
    updates.fullName = fn;
  }
  if (typeof body.bio === 'string') {
    updates.bio = body.bio.trim().slice(0, 500);
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({
      success: false,
      message: 'Provide fullName and/or bio',
      data: null,
    });
    return;
  }
  const u = await User.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );
  if (!u) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  res.json({ success: true, message: 'OK', data: userToApi(u) });
});

adminRouter.patch('/users/:id/innovator-verification', async (req, res) => {
  const { id } = req.params;
  const body = req.body as { verifiedInnovator?: unknown };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid user id',
      data: null,
    });
    return;
  }
  if (typeof body.verifiedInnovator !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'verifiedInnovator boolean required',
      data: null,
    });
    return;
  }

  const u = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        verifiedInnovator: body.verifiedInnovator,
        ...(body.verifiedInnovator
          ? {}
          : {
              verificationRequestAt: null,
              verificationRequestMessage: '',
            }),
      },
    },
    { new: true, runValidators: true }
  );
  if (!u) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  res.json({ success: true, message: 'OK', data: userToApi(u) });
});

adminRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const actorId = res.locals.authUserId as string | undefined;
  if (!actorId || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      data: null,
    });
    return;
  }
  if (id === actorId) {
    res.status(400).json({
      success: false,
      message: 'You cannot delete your own account',
      data: null,
    });
    return;
  }
  const target = await User.findById(id).select('role');
  if (!target) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  if (target.role === 'super_admin') {
    const n = await countSuperAdmins();
    if (n <= 1) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete the last super admin',
        data: null,
      });
      return;
    }
  }
  try {
    await purgeUser(new mongoose.Types.ObjectId(id));
  } catch (err) {
    console.error('[admin] purgeUser', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      data: null,
    });
    return;
  }
  res.json({ success: true, message: 'User and related data removed', data: null });
});

adminRouter.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!mongoose.Types.ObjectId.isValid(id) || typeof status !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      data: null,
    });
    return;
  }
  const allowed = new Set([
    'active',
    'inactive',
    'banned',
    'pending_verification',
  ]);
  if (!allowed.has(status)) {
    res.status(400).json({
      success: false,
      message: 'Invalid status',
      data: null,
    });
    return;
  }
  const u = await User.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  );
  if (!u) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  res.json({ success: true, message: 'OK', data: userToApi(u) });
});

adminRouter.patch('/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body as { role?: string };
  if (!mongoose.Types.ObjectId.isValid(id) || typeof role !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      data: null,
    });
    return;
  }
  const allowed = new Set(['user', 'collaborator', 'moderator', 'super_admin']);
  if (!allowed.has(role)) {
    res.status(400).json({
      success: false,
      message: 'Invalid role',
      data: null,
    });
    return;
  }
  const existing = await User.findById(id).select('role');
  if (!existing) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  if (existing.role === 'super_admin' && role !== 'super_admin') {
    const n = await countSuperAdmins();
    if (n <= 1) {
      res.status(400).json({
        success: false,
        message: 'Cannot demote the last super admin',
        data: null,
      });
      return;
    }
  }
  const u = await User.findByIdAndUpdate(
    id,
    { $set: { role } },
    { new: true }
  );
  if (!u) {
    res.status(404).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  res.json({ success: true, message: 'OK', data: userToApi(u) });
});

adminRouter.get('/ideas', async (req, res) => {
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const ideaStatus =
    typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const category =
    typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const minScoreRaw = req.query.minScore;
  const maxScoreRaw = req.query.maxScore;
  const minScore =
    typeof minScoreRaw === 'string' && minScoreRaw.trim()
      ? Number(minScoreRaw)
      : undefined;
  const maxScore =
    typeof maxScoreRaw === 'string' && maxScoreRaw.trim()
      ? Number(maxScoreRaw)
      : undefined;

  const filter: Record<string, unknown> = {};
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  if (ideaStatus) {
    filter.status = ideaStatus;
  }
  if (category) {
    filter.category = category;
  }
  const scoreRange: Record<string, number> = {};
  if (minScore !== undefined && !Number.isNaN(minScore)) {
    scoreRange.$gte = minScore;
  }
  if (maxScore !== undefined && !Number.isNaN(maxScore)) {
    scoreRange.$lte = maxScore;
  }
  if (Object.keys(scoreRange).length > 0) {
    filter.contentScanScore = scoreRange;
  }
  const docs = await Idea.find(filter)
    .sort({ _id: -1 })
    .limit(PAGE + 1);
  const hasMore = docs.length > PAGE;
  const page = hasMore ? docs.slice(0, PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;
  res.json({
    success: true,
    message: 'OK',
    data: page.map((i) => ideaToApi(i as IIdeaDocument)),
    meta: { nextCursor, hasMore: Boolean(nextCursor) },
  });
});

adminRouter.patch('/ideas/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body as {
    status?: string;
    reason?: string;
  };
  if (!mongoose.Types.ObjectId.isValid(id) || typeof status !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      data: null,
    });
    return;
  }
  const allowed = new Set([
    'draft',
    'pending_review',
    'ai_scanning',
    'published',
    'rejected',
    'archived',
    'flagged',
  ]);
  if (!allowed.has(status)) {
    res.status(400).json({
      success: false,
      message: 'Invalid status',
      data: null,
    });
    return;
  }
  const update: Record<string, unknown> = { status };
  if (typeof reason === 'string' && reason.trim()) {
    update.rejectionReason = reason.trim();
  }
  const idea = await Idea.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!idea) {
    res.status(404).json({
      success: false,
      message: 'Idea not found',
      data: null,
    });
    return;
  }
  res.json({
    success: true,
    message: 'OK',
    data: ideaToApi(idea),
  });
});

/** Feature / unfeature on homepage (uses `featuredAt`). */
adminRouter.patch('/ideas/:id/featured', async (req, res) => {
  const { id } = req.params;
  const { featured } = req.body as { featured?: unknown };
  if (!mongoose.Types.ObjectId.isValid(id) || typeof featured !== 'boolean') {
    res.status(400).json({
      success: false,
      message: 'featured boolean required',
      data: null,
    });
    return;
  }
  const idea = await Idea.findByIdAndUpdate(
    id,
    { $set: { featuredAt: featured ? new Date() : null } },
    { new: true }
  );
  if (!idea) {
    res.status(404).json({
      success: false,
      message: 'Idea not found',
      data: null,
    });
    return;
  }
  res.json({
    success: true,
    message: 'OK',
    data: ideaToApi(idea as IIdeaDocument),
  });
});

adminRouter.delete('/ideas/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid idea id',
      data: null,
    });
    return;
  }
  const exists = await Idea.exists({ _id: id });
  if (!exists) {
    res.status(404).json({
      success: false,
      message: 'Idea not found',
      data: null,
    });
    return;
  }
  try {
    await purgeIdea(new mongoose.Types.ObjectId(id));
  } catch (err) {
    console.error('[admin] purgeIdea', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete idea',
      data: null,
    });
    return;
  }
  res.json({ success: true, message: 'Idea removed', data: null });
});

adminRouter.get('/scan-queue', async (_req, res) => {
  const ideas = await Idea.find({
    status: { $in: ['flagged', 'ai_scanning', 'pending_review'] },
  })
    .sort({ contentScanScore: 1, updatedAt: -1 })
    .limit(100);
  res.json({
    success: true,
    message: 'OK',
    data: ideas.map((i) => ideaToApi(i as IIdeaDocument)),
  });
});

adminRouter.post('/scan-queue/:id/decision', async (req, res) => {
  const { id } = req.params;
  const { approved, reason } = req.body as {
    approved?: boolean;
    reason?: string;
  };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid id',
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
  if (approved === true) {
    idea.set('status', 'published');
    idea.set('visibility', 'public');
    idea.set('rejectionReason', '');
  } else {
    idea.set('status', 'rejected');
    if (typeof reason === 'string' && reason.trim()) {
      idea.set('rejectionReason', reason.trim());
    }
  }
  await idea.save();
  res.json({ success: true, message: 'OK', data: ideaToApi(idea) });
});

adminRouter.get('/audit-logs', async (req, res) => {
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const filter: Record<string, unknown> = {};
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  const docs = await AdminAuditLog.find(filter)
    .sort({ _id: -1 })
    .limit(PAGE + 1)
    .populate({
      path: 'adminId',
      select:
        'username email fullName avatarUrl role',
    });
  const hasMore = docs.length > PAGE;
  const page = hasMore ? docs.slice(0, PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;

  const data = page.map((log) => {
    const j = log.toJSON() as Record<string, unknown>;
    const adm = j.adminId;
    return {
      _id: String(j._id),
      adminId:
        adm && typeof adm === 'object' && '_id' in adm
          ? userToApi(adm as IUserDocument)
          : String(adm ?? ''),
      action: j.action,
      targetType: j.targetType,
      targetId: String(j.targetId),
      reason: j.reason ?? '',
      createdAt:
        j.createdAt instanceof Date
          ? j.createdAt.toISOString()
          : String(j.createdAt ?? ''),
    };
  });

  res.json({
    success: true,
    message: 'OK',
    data,
    meta: { nextCursor, hasMore: Boolean(nextCursor) },
  });
});

adminRouter.get('/comments', async (req, res) => {
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const statusFilter =
    typeof req.query.status === 'string' ? req.query.status.trim() : '';

  const filter: Record<string, unknown> = {};
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  if (
    statusFilter &&
    ['visible', 'hidden', 'flagged'].includes(statusFilter)
  ) {
    filter.status = statusFilter;
  }

  const docs = await Comment.find(filter)
    .sort({ _id: -1 })
    .limit(PAGE + 1)
    .populate('authorId', 'username fullName avatarUrl role')
    .populate('ideaId', 'title status');

  const hasMore = docs.length > PAGE;
  const page = hasMore ? docs.slice(0, PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0
      ? String(page[page.length - 1]!._id)
      : undefined;

  const data = page.map((c) => {
    const j = c.toJSON() as Record<string, unknown>;
    const author = j.authorId;
    const idea = j.ideaId;
    return {
      _id: String(j._id),
      ideaId:
        typeof idea === 'object' && idea && '_id' in idea
          ? String((idea as { _id: unknown })._id)
          : String(j.ideaId ?? ''),
      ideaTitle:
        typeof idea === 'object' && idea && 'title' in idea
          ? String((idea as { title?: string }).title ?? '')
          : '',
      author:
        author && typeof author === 'object' && '_id' in author
          ? userToApi(author as IUserDocument)
          : null,
      content: typeof j.content === 'string' ? j.content : '',
      status: j.status,
      likeCount: typeof j.likeCount === 'number' ? j.likeCount : 0,
      createdAt:
        j.createdAt instanceof Date
          ? j.createdAt.toISOString()
          : String(j.createdAt ?? ''),
    };
  });

  res.json({
    success: true,
    message: 'OK',
    data,
    meta: { nextCursor, hasMore: Boolean(nextCursor) },
  });
});

adminRouter.patch('/comments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!mongoose.Types.ObjectId.isValid(id) || typeof status !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      data: null,
    });
    return;
  }
  const allowed = new Set(['visible', 'hidden', 'flagged']);
  if (!allowed.has(status)) {
    res.status(400).json({
      success: false,
      message: 'Invalid status',
      data: null,
    });
    return;
  }
  const c = await Comment.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true }
  )
    .populate('authorId', 'username fullName avatarUrl role')
    .populate('ideaId', 'title status');
  if (!c) {
    res.status(404).json({
      success: false,
      message: 'Comment not found',
      data: null,
    });
    return;
  }
  const j = c.toJSON() as Record<string, unknown>;
  const author = j.authorId;
  const idea = j.ideaId;
  res.json({
    success: true,
    message: 'OK',
    data: {
      _id: String(j._id),
      ideaId:
        typeof idea === 'object' && idea && '_id' in idea
          ? String((idea as { _id: unknown })._id)
          : String(j.ideaId ?? ''),
      ideaTitle:
        typeof idea === 'object' && idea && 'title' in idea
          ? String((idea as { title?: string }).title ?? '')
          : '',
      author:
        author && typeof author === 'object' && '_id' in author
          ? userToApi(author as IUserDocument)
          : null,
      content: typeof j.content === 'string' ? j.content : '',
      status: j.status,
      likeCount: typeof j.likeCount === 'number' ? j.likeCount : 0,
      createdAt:
        j.createdAt instanceof Date
          ? j.createdAt.toISOString()
          : String(j.createdAt ?? ''),
    },
  });
});

adminRouter.post('/notifications/broadcast', async (_req, res) => {
  res.json({
    success: true,
    message: 'Broadcast queued (stub — wire FCM / in-app later)',
    data: null,
  });
});
