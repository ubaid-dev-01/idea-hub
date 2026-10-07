import cron from 'node-cron';
import mongoose from 'mongoose';

import { BehaviorEvent } from '../models/index.js';
import {
  TrendingTagsSnapshot,
  TRENDING_TAGS_DOC_ID,
} from '../models/TrendingTagsSnapshot.model.js';

type TagAggRow = { _id: string; score: number };

async function refreshTrendingTags(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await BehaviorEvent.aggregate<TagAggRow>([
    {
      $match: {
        createdAt: { $gte: since },
        ideaId: { $ne: null },
      },
    },
    {
      $lookup: {
        from: 'ideas',
        localField: 'ideaId',
        foreignField: '_id',
        as: 'idea',
      },
    },
    { $unwind: '$idea' },
    {
      $match: {
        'idea.status': 'published',
        'idea.visibility': 'public',
      },
    },
    { $unwind: '$idea.tags' },
    {
      $group: {
        _id: { $toLower: { $trim: { input: '$idea.tags' } } },
        score: { $sum: 1 },
      },
    },
    { $match: { _id: { $nin: ['', null] } } },
    { $sort: { score: -1 } },
    { $limit: 24 },
  ]);

  const tags = rows
    .filter((r) => r._id && r._id.length > 0)
    .map((r) => ({ tag: r._id, score: r.score }));

  await TrendingTagsSnapshot.findByIdAndUpdate(
    TRENDING_TAGS_DOC_ID,
    { $set: { tags, updatedAt: new Date() } },
    { upsert: true, new: true }
  ).catch((err) => {
    console.error('[trending-tags] snapshot failed', err);
  });
}

cron.schedule('*/15 * * * *', () => void refreshTrendingTags(), { timezone: 'UTC' });

void refreshTrendingTags();
