import mongoose from 'mongoose';

import { levelFromTotalXp } from '../../config/xp.config.js';
import {
  attachAiCoachForAuthor,
  ideaToApi,
} from '../../lib/serialize-idea.js';
import type { IIdeaDocument } from '../../models/Idea.model.js';
import { IdeaPollVote, Like, SavedIdea, User, UserProgress } from '../../models/index.js';
import { isGamificationEnabled } from '../../services/gamification.service.js';
import { authorMapForIds, deletedAuthorPlaceholder } from './author-utils.js';

export async function mapIdeasForPublicApi(
  docs: IIdeaDocument[],
  viewerUserId?: string | null
): Promise<Record<string, unknown>[]> {
  if (docs.length === 0) return [];
  const pollVotesByIdea = new Map<string, string>();
  const likedIds = new Set<string>();
  const savedIds = new Set<string>();
  if (viewerUserId && mongoose.Types.ObjectId.isValid(viewerUserId)) {
    const userOid = new mongoose.Types.ObjectId(viewerUserId);
    const ideaOids = docs.map((d) => d._id);
    const [votes, likes, saves] = await Promise.all([
      IdeaPollVote.find({
        userId: userOid,
        ideaId: { $in: ideaOids },
      })
        .select('ideaId optionKey')
        .lean<{ ideaId: mongoose.Types.ObjectId; optionKey: string }[]>(),
      Like.find({ userId: userOid, ideaId: { $in: ideaOids } })
        .select('ideaId')
        .lean<{ ideaId: mongoose.Types.ObjectId }[]>(),
      SavedIdea.find({ userId: userOid, ideaId: { $in: ideaOids } })
        .select('ideaId')
        .lean<{ ideaId: mongoose.Types.ObjectId }[]>(),
    ]);
    for (const v of votes) {
      pollVotesByIdea.set(String(v.ideaId), v.optionKey);
    }
    for (const l of likes) {
      likedIds.add(String(l.ideaId));
    }
    for (const s of saves) {
      savedIds.add(String(s.ideaId));
    }
  }

  const authorIds = [...new Set(docs.map((d) => String(d.authorId)))];
  const authors = await authorMapForIds(authorIds);
  const gamify = new Map<
    string,
    { level: number; levelTitle: string; levelEmoji: string; totalXP: number }
  >();
  if (isGamificationEnabled()) {
    const oids = authorIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (oids.length > 0) {
      const rows = await UserProgress.find({ userId: { $in: oids } })
        .select('userId totalXP level levelTitle')
        .lean<
          Array<{
            userId: mongoose.Types.ObjectId;
            totalXP?: number;
            level?: number;
            levelTitle?: string;
          }>
        >();
      for (const r of rows) {
        const totalXP = r.totalXP ?? 0;
        gamify.set(String(r.userId), {
          level: r.level ?? 1,
          levelTitle: r.levelTitle ?? 'Idea Spark',
          levelEmoji: levelFromTotalXp(totalXP).emoji,
          totalXP,
        });
      }
    }
  }
  return docs.map((idea) => {
    const j = ideaToApi(idea) as Record<string, unknown>;
    attachAiCoachForAuthor(idea, j, viewerUserId);
    const mv = pollVotesByIdea.get(String(idea._id));
    const poll = j.poll as Record<string, unknown> | undefined;
    if (poll && typeof poll === 'object') {
      j.poll = { ...poll, myVote: mv ?? null };
    }
    const aid = String(j.authorId);
    const userObj = authors.get(aid);
    const ideaId = String(idea._id);
    const flags =
      viewerUserId && mongoose.Types.ObjectId.isValid(viewerUserId)
        ? {
            liked: likedIds.has(ideaId),
            saved: savedIds.has(ideaId),
          }
        : {};
    if (!userObj) {
      return {
        ...j,
        ...flags,
        authorId: deletedAuthorPlaceholder(aid),
      };
    }
    const g = gamify.get(aid);
    return {
      ...j,
      ...flags,
      authorId: {
        ...userObj,
        ...(g ? { gamification: g } : {}),
      },
    };
  });
}
