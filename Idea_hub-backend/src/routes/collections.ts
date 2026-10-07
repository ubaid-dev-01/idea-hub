import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import { userToApiPublic } from '../lib/serialize-user.js';
import { optionalAuth } from '../middleware/optional-auth.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { IIdeaDocument } from '../models/Idea.model.js';
import type { IIdeaCollection } from '../models/IdeaCollection.model.js';
import type { IIdeaCollectionItem } from '../models/IdeaCollectionItem.model.js';
import {
  CollectionFollow,
  Idea,
  IdeaCollection,
  IdeaCollectionItem,
  User,
} from '../models/index.js';

export const collectionsRouter = Router();

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

async function mapCollectionIdeas(
  docs: IIdeaDocument[],
  viewerUserId?: string | null
): Promise<Record<string, unknown>[]> {
  if (docs.length === 0) return [];
  const { mapIdeasForPublicApi } = await import('./ideas.js');
  return mapIdeasForPublicApi(docs, viewerUserId);
}

collectionsRouter.post('/', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '';
  const isPublic = body.isPublic !== false;

  if (!name || name.length > 120) {
    res.status(400).json({
      success: false,
      message: 'name is required (max 120 chars)',
      data: null,
    });
    return;
  }

  const ownerOid = new mongoose.Types.ObjectId(userId);
  const col = await IdeaCollection.create({
    ownerId: ownerOid,
    name,
    description,
    isPublic,
  });

  res.status(201).json({
    success: true,
    message: 'Created',
    data: collectionToApi(col, false),
  });
});

collectionsRouter.get('/mine', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const rows = await IdeaCollection.find({ ownerId: userId })
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({
    success: true,
    message: 'OK',
    data: rows.map((c) => collectionToApi(c, false)),
  });
});

collectionsRouter.get(
  '/by-user/:username',
  requireDb,
  optionalAuth,
  async (req, res) => {
    const username =
      typeof req.params.username === 'string'
        ? req.params.username.trim().toLowerCase()
        : '';
    if (!username) {
      res.status(400).json({
        success: false,
        message: 'Invalid username',
        data: null,
      });
      return;
    }

    const owner = await User.findOne({ username }).select('_id').lean();
    if (!owner) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        data: null,
      });
      return;
    }

    const viewer = res.locals.authUserId as string | undefined;
    const isSelf = viewer && String(owner._id) === viewer;

    const filter: Record<string, unknown> = { ownerId: owner._id };
    if (!isSelf) {
      filter.isPublic = true;
    }

    const rows = await IdeaCollection.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({
      success: true,
      message: 'OK',
      data: rows.map((c: IIdeaCollection) => collectionToApi(c, false)),
    });
  }
);

function collectionToApi(
  c: {
    _id: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    name: string;
    description: string;
    slug: string;
    isPublic: boolean;
    followerCount: number;
    ideaCount: number;
    createdAt: Date;
    updatedAt: Date;
  },
  following: boolean
): Record<string, unknown> {
  return {
    _id: String(c._id),
    ownerId: String(c.ownerId),
    name: c.name,
    description: c.description ?? '',
    slug: c.slug,
    isPublic: c.isPublic,
    followerCount: c.followerCount ?? 0,
    ideaCount: c.ideaCount ?? 0,
    following,
    createdAt:
      c.createdAt instanceof Date
        ? c.createdAt.toISOString()
        : String(c.createdAt ?? ''),
    updatedAt:
      c.updatedAt instanceof Date
        ? c.updatedAt.toISOString()
        : String(c.updatedAt ?? ''),
  };
}

collectionsRouter.get('/:id', requireDb, optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid collection id',
      data: null,
    });
    return;
  }

  const col = await IdeaCollection.findById(id);
  if (!col) {
    res.status(404).json({
      success: false,
      message: 'Collection not found',
      data: null,
    });
    return;
  }

  const viewer = res.locals.authUserId as string | undefined;
  const isOwner = viewer && String(col.ownerId) === viewer;
  if (!col.isPublic && !isOwner) {
    res.status(403).json({
      success: false,
      message: 'This collection is private',
      data: null,
    });
    return;
  }

  let following = false;
  if (viewer && mongoose.Types.ObjectId.isValid(viewer)) {
    following = Boolean(
      await CollectionFollow.exists({
        followerId: viewer,
        collectionId: col._id,
      })
    );
  }

  const items = await IdeaCollectionItem.find({ collectionId: col._id })
    .sort({ sortOrder: 1, createdAt: 1 })
    .limit(200)
    .lean<Pick<IIdeaCollectionItem, 'ideaId'>[]>();

  const ideaIds = items.map((i: { ideaId: mongoose.Types.ObjectId }) => i.ideaId);
  const ideas = await Idea.find({
    _id: { $in: ideaIds },
    status: 'published',
    visibility: 'public',
  });
  const byId = new Map(ideas.map((idea: IIdeaDocument) => [String(idea._id), idea]));
  const ordered = ideaIds
    .map((oid: mongoose.Types.ObjectId) => byId.get(String(oid)))
    .filter((x): x is IIdeaDocument => Boolean(x));

  const owner = await User.findById(col.ownerId);
  const ideaPayloads = await mapCollectionIdeas(ordered, viewer ?? null);

  res.json({
    success: true,
    message: 'OK',
    data: {
      collection: collectionToApi(col, following),
      owner: owner ? userToApiPublic(owner) : null,
      ideas: ideaPayloads,
    },
  });
});

collectionsRouter.patch('/:id', requireDb, requireAuth, async (req, res) => {
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
      message: 'Invalid collection id',
      data: null,
    });
    return;
  }

  const col = await IdeaCollection.findById(id);
  if (!col || String(col.ownerId) !== userId) {
    res.status(404).json({
      success: false,
      message: 'Collection not found',
      data: null,
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  if (typeof body.name === 'string' && body.name.trim()) {
    col.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.description === 'string') {
    col.description = body.description.trim().slice(0, 2000);
  }
  if (typeof body.isPublic === 'boolean') {
    col.isPublic = body.isPublic;
  }
  await col.save();

  res.json({
    success: true,
    message: 'OK',
    data: collectionToApi(col, false),
  });
});

collectionsRouter.delete('/:id', requireDb, requireAuth, async (req, res) => {
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

  const col = await IdeaCollection.findById(id);
  if (!col || String(col.ownerId) !== userId) {
    res.status(404).json({
      success: false,
      message: 'Collection not found',
      data: null,
    });
    return;
  }

  await IdeaCollectionItem.deleteMany({ collectionId: col._id });
  await CollectionFollow.deleteMany({ collectionId: col._id });
  await col.deleteOne();

  res.json({ success: true, message: 'Deleted', data: null });
});

collectionsRouter.post('/:id/items', requireDb, requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  const body = req.body as { ideaId?: unknown };
  const ideaId = typeof body.ideaId === 'string' ? body.ideaId.trim() : '';

  if (!userId || !mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(ideaId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid request',
      data: null,
    });
    return;
  }

  const col = await IdeaCollection.findById(id);
  if (!col || String(col.ownerId) !== userId) {
    res.status(404).json({
      success: false,
      message: 'Collection not found',
      data: null,
    });
    return;
  }

  const idea = await Idea.findById(ideaId)
    .select('authorId status visibility')
    .lean<{
      authorId: mongoose.Types.ObjectId;
      status: string;
      visibility: string;
    } | null>();

  if (!idea || idea.status !== 'published') {
    res.status(400).json({
      success: false,
      message: 'Idea not found or not published',
      data: null,
    });
    return;
  }
  if (String(idea.authorId) !== userId && idea.visibility !== 'public') {
    res.status(403).json({
      success: false,
      message: 'You can only add your own ideas or public ideas',
      data: null,
    });
    return;
  }

  try {
    const maxOrder = await IdeaCollectionItem.findOne({ collectionId: col._id })
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean();
    const nextOrder = (maxOrder?.sortOrder ?? 0) + 1;
    await IdeaCollectionItem.create({
      collectionId: col._id,
      ideaId: new mongoose.Types.ObjectId(ideaId),
      sortOrder: nextOrder,
    });
    col.ideaCount = await IdeaCollectionItem.countDocuments({
      collectionId: col._id,
    });
    await col.save();
  } catch (e) {
    const dup =
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: number }).code === 11000;
    if (dup) {
      res.status(400).json({
        success: false,
        message: 'Idea already in collection',
        data: null,
      });
      return;
    }
    throw e;
  }

  const fresh = await IdeaCollection.findById(col._id);
  res.status(201).json({
    success: true,
    message: 'Added',
    data: fresh ? collectionToApi(fresh, false) : null,
  });
});

collectionsRouter.delete(
  '/:id/items/:ideaId',
  requireDb,
  requireAuth,
  async (req, res) => {
    const { id, ideaId } = req.params;
    const userId = res.locals.authUserId;
    if (
      !userId ||
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(ideaId)
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid request',
        data: null,
      });
      return;
    }

    const col = await IdeaCollection.findById(id);
    if (!col || String(col.ownerId) !== userId) {
      res.status(404).json({
        success: false,
        message: 'Collection not found',
        data: null,
      });
      return;
    }

    await IdeaCollectionItem.deleteOne({
      collectionId: col._id,
      ideaId: new mongoose.Types.ObjectId(ideaId),
    });
    col.ideaCount = await IdeaCollectionItem.countDocuments({
      collectionId: col._id,
    });
    await col.save();

    res.json({
      success: true,
      message: 'OK',
      data: collectionToApi(col, false),
    });
  }
);

collectionsRouter.post('/:id/follow', requireDb, requireAuth, async (req, res) => {
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

  const col = await IdeaCollection.findById(id);
  if (!col || !col.isPublic) {
    res.status(404).json({
      success: false,
      message: 'Collection not found',
      data: null,
    });
    return;
  }

  const followerOid = new mongoose.Types.ObjectId(userId);
  if (String(col.ownerId) === userId) {
    res.json({
      success: true,
      message: 'OK',
      data: collectionToApi(col, true),
    });
    return;
  }

  try {
    await CollectionFollow.create({
      followerId: followerOid,
      collectionId: col._id,
    });
    await IdeaCollection.updateOne(
      { _id: col._id },
      { $inc: { followerCount: 1 } }
    );
  } catch (e) {
    const dup =
      typeof e === 'object' &&
      e !== null &&
      'code' in e &&
      (e as { code: number }).code === 11000;
    if (!dup) throw e;
  }

  const fresh = await IdeaCollection.findById(col._id);
  res.json({
    success: true,
    message: 'OK',
    data: fresh ? collectionToApi(fresh, true) : null,
  });
});

collectionsRouter.delete('/:id/follow', requireDb, requireAuth, async (req, res) => {
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

  const col = await IdeaCollection.findById(id);
  if (!col) {
    res.status(404).json({
      success: false,
      message: 'Collection not found',
      data: null,
    });
    return;
  }

  const del = await CollectionFollow.deleteOne({
    followerId: userId,
    collectionId: col._id,
  });
  if (del.deletedCount > 0) {
    await IdeaCollection.updateOne(
      { _id: col._id, followerCount: { $gt: 0 } },
      { $inc: { followerCount: -1 } }
    );
  }

  const fresh = await IdeaCollection.findById(col._id);
  res.json({
    success: true,
    message: 'OK',
    data: fresh ? collectionToApi(fresh, false) : null,
  });
});
