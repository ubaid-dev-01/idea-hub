import type { Router } from 'express';
import mongoose from 'mongoose';

import { cacheGetJson, cacheSetJson } from '../../lib/api-cache.js';
import { optionalAuth } from '../../middleware/optional-auth.js';
import { Idea } from '../../models/index.js';
import {
  TrendingTagsSnapshot,
  TRENDING_TAGS_DOC_ID,
} from '../../models/TrendingTagsSnapshot.model.js';
import { getFeedPage } from '../../services/feed.service.js';
import {
  CATEGORIES,
  SEARCH_PAGE,
  TRENDING_LIMIT,
} from './constants.js';
import { escapeRegex, publicFeedFilter, requireDb } from './guards.js';
import { mapIdeasForPublicApi } from './map-public.js';

const TRENDING_TTL_SEC = 45;

export function registerFeedRoutes(ideasRouter: Router): void {
  ideasRouter.get('/trending', requireDb, optionalAuth, async (req, res) => {
    const viewer = res.locals.authUserId as string | undefined;
    const cacheKey = `ideas:trending:${viewer ?? 'anon'}`;
    const hit = await cacheGetJson<{
      success: boolean;
      message: string;
      data: unknown;
    }>(cacheKey);
    if (hit) {
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.json(hit);
      return;
    }

    const ideas = await Idea.find(publicFeedFilter())
      .sort({ trendingScore: -1, likeCount: -1, _id: -1 })
      .limit(TRENDING_LIMIT);
    const body = {
      success: true,
      message: 'OK',
      data: await mapIdeasForPublicApi(ideas, viewer ?? null),
    };
    await cacheSetJson(cacheKey, body, TRENDING_TTL_SEC);
    res.setHeader('Cache-Control', 'private, max-age=30');
    res.json(body);
  });

  ideasRouter.get('/trending-tags', requireDb, async (_req, res) => {
    const doc = await TrendingTagsSnapshot.findById(TRENDING_TAGS_DOC_ID)
      .lean<{
        tags: Array<{ tag: string; score: number }>;
        updatedAt?: Date;
      } | null>();
    res.setHeader('Cache-Control', 'public, max-age=120');
    res.json({
      success: true,
      message: 'OK',
      data: {
        tags: doc?.tags ?? [],
        updatedAt:
          doc?.updatedAt instanceof Date
            ? doc.updatedAt.toISOString()
            : doc?.updatedAt
              ? String(doc.updatedAt)
              : null,
      },
    });
  });

  ideasRouter.get('/search', requireDb, optionalAuth, async (req, res) => {
    const filter: Record<string, unknown> = { ...publicFeedFilter() };

    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const category =
      typeof req.query.category === 'string' ? req.query.category.trim() : '';
    if (category && CATEGORIES.has(category)) {
      filter.category = category;
    }

    const tagsRaw =
      typeof req.query.tags === 'string' ? req.query.tags.trim() : '';
    if (tagsRaw) {
      const tagList = tagsRaw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      if (tagList.length) {
        filter.tags = { $all: tagList };
      }
    }

    if (req.query.hasMedia === 'true') {
      filter['media.0'] = { $exists: true };
    }

    if (req.query.collaboratorsOpen === 'true') {
      filter.collaboratorsOpen = true;
    }

    const dateFrom =
      typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : '';
    const dateTo =
      typeof req.query.dateTo === 'string' ? req.query.dateTo.trim() : '';
    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        if (!Number.isNaN(d.getTime())) range.$lte = d;
      }
      if (Object.keys(range).length) {
        filter.createdAt = range;
      }
    }

    const sortBy = req.query.sortBy;
    let sort: Record<string, 1 | -1> = { _id: -1 };
    if (sortBy === 'trending') {
      sort = { trendingScore: -1, _id: -1 };
    } else if (sortBy === 'likes') {
      sort = { likeCount: -1, _id: -1 };
    }

    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const docs = await Idea.find(filter).sort(sort).limit(SEARCH_PAGE + 1);
    const hasMore = docs.length > SEARCH_PAGE;
    const page = hasMore ? docs.slice(0, SEARCH_PAGE) : docs;
    const nextCursor =
      hasMore && page.length > 0
        ? String(page[page.length - 1]!._id)
        : undefined;

    const viewer = res.locals.authUserId as string | undefined;
    res.json({
      success: true,
      message: 'OK',
      data: await mapIdeasForPublicApi(page, viewer ?? null),
      meta: {
        nextCursor,
        hasMore: Boolean(nextCursor),
      },
    });
  });

  ideasRouter.get('/', requireDb, optionalAuth, async (req, res) => {
    const cursor =
      typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === 'string' && /^\d+$/.test(limitRaw)
        ? Number(limitRaw)
        : undefined;
    const userId = res.locals.authUserId ?? null;
    const tag =
      typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';

    const { ideas, nextCursor } = await getFeedPage({
      userId,
      cursor: cursor || null,
      limit,
      tag: tag || null,
    });

    res.json({
      success: true,
      message: 'OK',
      data: await mapIdeasForPublicApi(ideas, userId),
      meta: {
        nextCursor,
        hasMore: Boolean(nextCursor),
      },
    });
  });
}
