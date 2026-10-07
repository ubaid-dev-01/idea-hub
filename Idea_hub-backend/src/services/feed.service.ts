import mongoose from 'mongoose';

import type { IIdeaDocument } from '../models/Idea.model.js';
import { Follow, Idea, User } from '../models/index.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const PERSONAL_POOL_MULT = 8;

function hoursSince(d: Date): number {
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}

type ScoreCtx = {
  categoryWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  followingAuthorIds: Set<string>;
};

function scoreIdea(idea: IIdeaDocument, ctx: ScoreCtx): number {
  const ageH = hoursSince(idea.createdAt);
  const recency = Math.exp(-ageH / 48) * 2;
  const trending = Math.log1p(Math.max(0, idea.trendingScore ?? 0)) * 1.5;
  const cat = ctx.categoryWeights[String(idea.category)] ?? 0;
  const categoryMatch = cat * 3;
  let tagMatch = 0;
  for (const t of idea.tags ?? []) {
    tagMatch += ctx.tagWeights[String(t).toLowerCase()] ?? 0;
  }
  tagMatch *= 0.5;
  const network = ctx.followingAuthorIds.has(String(idea.authorId))
    ? 4
    : 0;
  return recency + trending + categoryMatch + tagMatch + network;
}

export async function getFeedPage(params: {
  userId: string | null;
  cursor?: string | null;
  limit?: number;
  /** Single tag filter (lowercase); matches ideas that include this tag */
  tag?: string | null;
}): Promise<{ ideas: IIdeaDocument[]; nextCursor?: string }> {
  const limit = Math.min(
    Math.max(params.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );

  const filter: Record<string, unknown> = {
    status: 'published',
    visibility: 'public',
  };
  const tag = params.tag?.trim().toLowerCase();
  if (tag) {
    filter.tags = tag;
  }
  if (params.cursor && mongoose.Types.ObjectId.isValid(params.cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(params.cursor) };
  }

  const fetchLimit = params.userId
    ? Math.min(200, Math.max(limit * PERSONAL_POOL_MULT, 60))
    : limit + 1;

  const pool = await Idea.find(filter)
    .sort({ _id: -1 })
    .limit(fetchLimit)
    .exec();

  if (pool.length === 0) {
    return { ideas: [] };
  }

  if (!params.userId) {
    const hasMore = pool.length > limit;
    const page = hasMore ? pool.slice(0, limit) : pool;
    return {
      ideas: page,
      nextCursor:
        hasMore && page.length > 0
          ? String(page[page.length - 1]!._id)
          : undefined,
    };
  }

  const user = await User.findById(params.userId)
    .select('interestProfile')
    .lean<{
      interestProfile?: {
        categoryWeights?: Record<string, number>;
        tagWeights?: Record<string, number>;
      };
    } | null>();

  const follows = await Follow.find({
    followerId: new mongoose.Types.ObjectId(params.userId),
  })
    .select('followingId')
    .lean<{ followingId: mongoose.Types.ObjectId }[]>();

  const ctx: ScoreCtx = {
    categoryWeights: {
      ...(user?.interestProfile?.categoryWeights ?? {}),
    },
    tagWeights: { ...(user?.interestProfile?.tagWeights ?? {}) },
    followingAuthorIds: new Set(
      follows.map((f) => String(f.followingId))
    ),
  };

  const scored = pool.map((idea) => ({
    idea,
    score: scoreIdea(idea, ctx),
  }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.idea._id).localeCompare(String(a.idea._id));
  });

  const pageIdeas = scored.slice(0, limit).map((s) => s.idea);
  const hasMore =
    scored.length > limit || pool.length === fetchLimit;
  const nextCursor =
    pageIdeas.length === limit && hasMore
      ? String(pageIdeas[pageIdeas.length - 1]!._id)
      : undefined;

  return { ideas: pageIdeas, nextCursor };
}
