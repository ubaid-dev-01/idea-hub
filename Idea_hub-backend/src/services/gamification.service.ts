import mongoose, { type Types } from 'mongoose';

import {
  BADGE_DEFINITIONS,
  XP_REWARDS,
  type BadgeRarity,
  type ChallengeMetric,
  type XpRewardKey,
  levelFromTotalXp,
  pickWeeklyChallenge,
} from '../config/xp.config.js';
import { Idea, User, UserProgress } from '../models/index.js';
import type { IUserProgressDocument } from '../models/UserProgress.model.js';

const BADGE_IDS = new Set(BADGE_DEFINITIONS.map((b) => b.id));
const RARITY_MAP = new Map(
  BADGE_DEFINITIONS.map((b) => [b.id, b.rarity] as const)
);

export function isGamificationEnabled(): boolean {
  return String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true';
}

export function currentWeekBucket(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = x.getUTCDay() || 7;
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1));
  return x.toISOString().slice(0, 10);
}

function defaultChallenge(weekOf: Date, seed: string): IUserProgressDocument['weeklyChallenge'] {
  const pick = pickWeeklyChallenge(
    seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  );
  return {
    challengeId: pick.id,
    title: pick.title,
    description: pick.description,
    metric: pick.metric,
    target: pick.target,
    progress: 0,
    completed: false,
    weekOf,
    category: pick.category,
  };
}

export async function ensureUserProgress(
  userId: string | Types.ObjectId
): Promise<IUserProgressDocument | null> {
  if (!isGamificationEnabled()) return null;
  const uid =
    typeof userId === 'string'
      ? new mongoose.Types.ObjectId(userId)
      : userId;
  if (!mongoose.Types.ObjectId.isValid(String(uid))) return null;

  let doc = await UserProgress.findOne({ userId: uid });
  const bucket = currentWeekBucket();
  const monday = new Date(`${bucket}T00:00:00.000Z`);

  if (!doc) {
    const user = await User.findById(uid).select('createdAt').lean();
    if (!user) return null;
    doc = await UserProgress.create({
      userId: uid,
      weekBucket: bucket,
      weeklyChallenge: defaultChallenge(monday, String(uid)),
    });
    await maybeGrantEarlyAdopter(doc, user.createdAt);
    await evaluateBadges(doc);
    return doc;
  }

  if (doc.weekBucket !== bucket) {
    doc.weekBucket = bucket;
    doc.weeklyXpEarned = 0;
    doc.weeklyChallenge = defaultChallenge(monday, String(uid));
    await doc.save();
  }

  if (!doc.weeklyChallenge) {
    doc.weeklyChallenge = defaultChallenge(monday, String(uid));
    await doc.save();
  }

  return doc;
}

async function maybeGrantEarlyAdopter(
  doc: IUserProgressDocument,
  userCreatedAt: Date
): Promise<void> {
  const endIso = process.env.EARLY_ADOPTER_END_ISO?.trim();
  const end = endIso ? new Date(endIso) : null;
  if (end && !Number.isNaN(end.getTime()) && userCreatedAt <= end) {
    await grantBadge(doc, 'early_adopter');
  }
}

export async function grantBadge(
  progress: IUserProgressDocument,
  badgeId: string
): Promise<boolean> {
  if (!BADGE_IDS.has(badgeId)) return false;
  if (progress.badges.some((b) => b.badgeId === badgeId)) return false;
  const rarity = RARITY_MAP.get(badgeId) ?? 'common';
  progress.badges.push({
    badgeId,
    earnedAt: new Date(),
    rarity: rarity as BadgeRarity,
  });
  await progress.save();
  return true;
}

async function addXpRaw(
  progress: IUserProgressDocument,
  amount: number
): Promise<void> {
  if (amount <= 0) return;
  const bucket = currentWeekBucket();
  if (progress.weekBucket !== bucket) {
    progress.weekBucket = bucket;
    progress.weeklyXpEarned = 0;
  }
  progress.totalXP += amount;
  progress.weeklyXpEarned += amount;
  const { level, title } = levelFromTotalXp(progress.totalXP);
  progress.level = level;
  progress.levelTitle = title;
  await progress.save();
}

export async function addXpByKey(
  userId: string,
  key: XpRewardKey
): Promise<void> {
  if (!isGamificationEnabled()) return;
  const amount = XP_REWARDS[key];
  if (!amount) return;
  const doc = await ensureUserProgress(userId);
  if (!doc) return;
  await addXpRaw(doc, amount);
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function addXpAmount(userId: string, amount: number): Promise<void> {
  if (!isGamificationEnabled() || amount <= 0) return;
  const doc = await ensureUserProgress(userId);
  if (!doc) return;
  await addXpRaw(doc, amount);
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function evaluateBadges(progress: IUserProgressDocument): Promise<void> {
  const has = (id: string) => progress.badges.some((b) => b.badgeId === id);
  const user = await User.findById(progress.userId)
    .select('skills followerCount')
    .lean();

  const checks: Array<[string, boolean]> = [
    ['first_idea', progress.ideasPosted >= 1],
    ['idea_machine_10', progress.ideasPosted >= 10],
    ['prolific_50', progress.ideasPosted >= 50],
    ['generous_liker', progress.ideasLiked >= 100],
    ['superfan_500', progress.ideasLiked >= 500],
    ['voice_50', progress.commentsPosted >= 50],
    ['discussion_leader', progress.commentsPosted >= 200],
    ['team_player', progress.collabRequestsSent >= 1],
    ['collaboration_king', progress.collaborationsJoined >= 10],
    ['streak_7', progress.currentStreak >= 7],
    ['streak_30', progress.currentStreak >= 30],
    ['streak_100', progress.currentStreak >= 100],
    ['validation_expert', progress.validationVotesGiven >= 100],
    ['trending_star', progress.ideasTrendingCount >= 1],
    ['trending_master', progress.ideasTrendingCount >= 5],
    ['rising_star_level', progress.level >= 10],
    ['veteran_level', progress.level >= 25],
    ['hall_of_fame_level', progress.level >= 50],
    ['challenge_seeker', progress.challengesCompleted >= 1],
    ['challenge_master', progress.challengesCompleted >= 5],
    ['xp_milestone_1k', progress.totalXP >= 1000],
    ['xp_milestone_10k', progress.totalXP >= 10000],
    ['collector', progress.savedIdeasCount >= 25],
    [
      'skilled_profile',
      Boolean(user && (user.skills?.length ?? 0) >= 5),
    ],
    [
      'connector',
      Boolean(user && (user.followerCount ?? 0) >= 1),
    ],
  ];

  let added = false;
  for (const [id, ok] of checks) {
    if (!ok || has(id)) continue;
    if (!BADGE_IDS.has(id)) continue;
    const rarity = RARITY_MAP.get(id) ?? 'common';
    progress.badges.push({
      badgeId: id,
      earnedAt: new Date(),
      rarity: rarity as BadgeRarity,
    });
    added = true;
  }
  if (added) await progress.save();
}

function utcDayString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function recordDailyActivity(userId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(userId);
  if (!doc) return;

  const today = utcDayString(new Date());
  const last = doc.lastActiveDate
    ? utcDayString(new Date(doc.lastActiveDate))
    : null;

  if (last === today) return;

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yStr = utcDayString(yesterday);

  if (last === null || last === undefined) {
    doc.currentStreak = 1;
  } else if (last === yStr) {
    doc.currentStreak += 1;
  } else {
    doc.currentStreak = 1;
  }

  doc.lastActiveDate = new Date();
  if (doc.currentStreak > doc.longestStreak) {
    doc.longestStreak = doc.currentStreak;
  }

  await doc.save();
  await addXpByKey(userId, 'daily_login');

  if (doc.currentStreak === 7) await addXpByKey(userId, 'streak_7_days');
  if (doc.currentStreak === 30) await addXpByKey(userId, 'streak_30_days');

  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

async function bumpChallenge(
  progress: IUserProgressDocument,
  metric: ChallengeMetric,
  delta: number,
  ctx?: { category?: string }
): Promise<void> {
  const ch = progress.weeklyChallenge;
  if (!ch || ch.completed || delta <= 0) return;
  if (ch.metric !== metric) return;
  if (ch.category && ctx?.category && ch.category !== ctx.category) return;

  ch.progress = Math.min(ch.target, ch.progress + delta);
  if (ch.progress >= ch.target && !ch.completed) {
    ch.completed = true;
    progress.challengesCompleted += 1;
    await addXpRaw(progress, XP_REWARDS.weekly_challenge_complete);
  } else {
    await progress.save();
  }
  const fresh = await UserProgress.findById(progress._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onIdeaPublished(
  authorId: string,
  category: string
): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(authorId);
  if (!doc) return;

  const wasFirst = doc.ideasPosted === 0;
  doc.ideasPosted += 1;
  await doc.save();

  await addXpByKey(authorId, 'post_idea');
  if (wasFirst) await addXpByKey(authorId, 'first_idea');

  const updated = await UserProgress.findById(doc._id);
  if (updated) await bumpChallenge(updated, 'ideas_posted', 1, { category });
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onIdeaDuetPublished(
  duetAuthorId: string,
  originalAuthorId: string
): Promise<void> {
  if (!isGamificationEnabled()) return;
  if (duetAuthorId === originalAuthorId) return;
  await addXpByKey(duetAuthorId, 'duet_published');
  await addXpByKey(originalAuthorId, 'duet_original_credited');
}

export async function onIdeaReceivedLike(
  authorId: string,
  newLikeCount: number
): Promise<void> {
  if (!isGamificationEnabled()) return;
  await addXpByKey(authorId, 'idea_gets_like');

  if (newLikeCount === 50) await addXpByKey(authorId, 'idea_reaches_50_likes');
  if (newLikeCount === 100) await addXpByKey(authorId, 'idea_reaches_100_likes');

  const doc = await ensureUserProgress(authorId);
  if (doc) {
    await bumpChallenge(doc, 'likes_received_on_ideas', 1);
  }
}

export async function onLikeGiven(likerId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(likerId);
  if (!doc) return;
  doc.ideasLiked += 1;
  await doc.save();
  await bumpChallenge(doc, 'likes_given', 1);
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onCommentPosted(userId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(userId);
  if (!doc) return;
  doc.commentsPosted += 1;
  await doc.save();
  await addXpByKey(userId, 'comment_posted');
  await bumpChallenge(doc, 'comments_posted', 1);
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onCollabRequestSent(requesterId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(requesterId);
  if (!doc) return;
  doc.collabRequestsSent += 1;
  await doc.save();
  await addXpByKey(requesterId, 'collab_request_sent');
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onCollabAccepted(requesterId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(requesterId);
  if (!doc) return;
  doc.collaborationsJoined += 1;
  await doc.save();
  await addXpByKey(requesterId, 'collab_accepted');
  await bumpChallenge(doc, 'collabs_accepted', 1);
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onValidationVote(userId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(userId);
  if (!doc) return;
  doc.validationVotesGiven += 1;
  await doc.save();
  await addXpByKey(userId, 'validation_vote_given');
  await bumpChallenge(doc, 'validation_votes', 1);
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onIdeaTrending(authorId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(authorId);
  if (!doc) return;
  doc.ideasTrendingCount += 1;
  await doc.save();
  await addXpByKey(authorId, 'idea_goes_trending');
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onSavedIdea(userId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const doc = await ensureUserProgress(userId);
  if (!doc) return;
  doc.savedIdeasCount += 1;
  await doc.save();
  const fresh = await UserProgress.findById(doc._id);
  if (fresh) await evaluateBadges(fresh);
}

export async function onIdeaQualityScore(authorId: string, total: number): Promise<void> {
  if (!isGamificationEnabled() || total < 90) return;
  const doc = await ensureUserProgress(authorId);
  if (!doc) return;
  await grantBadge(doc, 'idea_quality');
  await evaluateBadges(doc);
}

export async function onNewFollower(followingId: string): Promise<void> {
  if (!isGamificationEnabled()) return;
  const u = await User.findById(followingId).select('followerCount').lean();
  if (!u || (u.followerCount ?? 0) !== 1) return;
  const doc = await ensureUserProgress(followingId);
  if (!doc) return;
  await grantBadge(doc, 'connector');
}

export async function grantTopWeeklyBadge(userIds: string[]): Promise<void> {
  if (!isGamificationEnabled()) return;
  for (const id of userIds) {
    const doc = await ensureUserProgress(id);
    if (doc) await grantBadge(doc, 'top_weekly_contributor');
  }
}

export function previousWeekBucket(): string {
  const monday = new Date(`${currentWeekBucket()}T00:00:00.000Z`);
  monday.setUTCDate(monday.getUTCDate() - 7);
  return monday.toISOString().slice(0, 10);
}

/** Monday 00:00 UTC weekly job: badge last week’s top 10, reset XP + challenges. */
export async function runWeeklyGamificationReset(): Promise<void> {
  if (!isGamificationEnabled()) return;
  const prev = previousWeekBucket();
  const top = await UserProgress.find({ weekBucket: prev })
    .sort({ weeklyXpEarned: -1 })
    .limit(10)
    .select('userId')
    .lean();
  await grantTopWeeklyBadge(top.map((t) => String(t.userId)));

  const newBucket = currentWeekBucket();
  const monday = new Date(`${newBucket}T00:00:00.000Z`);
  const cursor = UserProgress.find().cursor();
  for await (const doc of cursor) {
    doc.weekBucket = newBucket;
    doc.weeklyXpEarned = 0;
    doc.weeklyChallenge = defaultChallenge(monday, String(doc.userId));
    await doc.save();
  }
  console.log(`[gamification] Weekly reset → bucket ${newBucket}`);
}

export function progressToApi(p: IUserProgressDocument): Record<string, unknown> {
  const ch = p.weeklyChallenge;
  return {
    userId: String(p.userId),
    totalXP: p.totalXP,
    level: p.level,
    levelTitle: p.levelTitle,
    levelEmoji: levelFromTotalXp(p.totalXP).emoji,
    currentStreak: p.currentStreak,
    longestStreak: p.longestStreak,
    lastActiveDate: p.lastActiveDate
      ? new Date(p.lastActiveDate).toISOString()
      : null,
    badges: p.badges.map((b) => ({
      badgeId: b.badgeId,
      earnedAt: new Date(b.earnedAt).toISOString(),
      rarity: b.rarity,
    })),
    ideasPosted: p.ideasPosted,
    collaborationsJoined: p.collaborationsJoined,
    collabRequestsSent: p.collabRequestsSent,
    ideasLiked: p.ideasLiked,
    commentsPosted: p.commentsPosted,
    validationVotesGiven: p.validationVotesGiven,
    ideasTrendingCount: p.ideasTrendingCount,
    savedIdeasCount: p.savedIdeasCount,
    challengesCompleted: p.challengesCompleted,
    weekBucket: p.weekBucket,
    weeklyXpEarned: p.weeklyXpEarned,
    weeklyChallenge: ch
      ? {
          challengeId: ch.challengeId,
          title: ch.title,
          description: ch.description,
          metric: ch.metric,
          target: ch.target,
          progress: ch.progress,
          completed: ch.completed,
          weekOf: new Date(ch.weekOf).toISOString(),
          category: ch.category,
        }
      : null,
    xpIntoLevel: levelFromTotalXp(p.totalXP).xpIntoLevel,
    xpToNext: levelFromTotalXp(p.totalXP).xpToNext,
  };
}

export async function getLeaderboard(opts: {
  weekBucket: string;
  limit: number;
  followingIds?: Types.ObjectId[];
  category?: string;
}): Promise<
  Array<{
    rank: number;
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    weeklyXpEarned: number;
    level: number;
    levelTitle: string;
  }>
> {
  if (opts.followingIds && opts.followingIds.length === 0) {
    return [];
  }
  const match: Record<string, unknown> = { weekBucket: opts.weekBucket };
  if (opts.followingIds?.length) {
    match.userId = { $in: opts.followingIds };
  }

  let userFilter: Types.ObjectId[] | undefined;
  if (opts.category) {
    const ids = await Idea.distinct('authorId', {
      status: 'published',
      category: opts.category,
    });
    userFilter = ids.map((id) => new mongoose.Types.ObjectId(String(id)));
    if (opts.followingIds?.length) {
      const allowed = new Set(opts.followingIds.map(String));
      match.userId = {
        $in: userFilter.filter((id) => allowed.has(String(id))),
      };
    } else {
      match.userId = { $in: userFilter };
    }
  }

  const rows = await UserProgress.find(match)
    .sort({ weeklyXpEarned: -1 })
    .limit(opts.limit)
    .populate<{ username: string; fullName: string; avatarUrl: string }>(
      'userId',
      'username fullName avatarUrl'
    )
    .lean();

  return rows.map((r, i) => {
    const pop = r.userId as unknown;
    const u =
      pop && typeof pop === 'object' && 'username' in pop
        ? (pop as {
            _id?: unknown;
            username?: string;
            fullName?: string;
            avatarUrl?: string;
          })
        : null;
    return {
      rank: i + 1,
      userId: u?._id != null ? String(u._id) : String(r.userId),
      username: u?.username ?? '',
      fullName: u?.fullName ?? '',
      avatarUrl: u?.avatarUrl ?? '',
      weeklyXpEarned: r.weeklyXpEarned ?? 0,
      level: r.level ?? 1,
      levelTitle: r.levelTitle ?? 'Idea Spark',
    };
  });
}

export async function getUserRank(
  userId: string,
  weekBucket: string
): Promise<number | null> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const uid = new mongoose.Types.ObjectId(userId);
  const me = await UserProgress.findOne({ userId: uid, weekBucket })
    .select('weeklyXpEarned')
    .lean();
  if (!me) return null;
  const higher = await UserProgress.countDocuments({
    weekBucket,
    weeklyXpEarned: { $gt: me.weeklyXpEarned ?? 0 },
  });
  return higher + 1;
}
