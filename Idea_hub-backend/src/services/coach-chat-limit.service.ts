import {
  coachFreeDailyMessageLimit,
} from '../config/ai-coach.config.js';
import { hasPaidProOrInvestor } from '../lib/subscription.js';
import type { IUserSubscription } from '../models/User.model.js';

const memCounts = new Map<string, number>();

export function utcDayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(from = new Date()): number {
  const t = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(1, Math.floor((t - from.getTime()) / 1000));
}

export function coachChatMemoryKey(userId: string, day = utcDayString()): string {
  return `${userId}:${day}`;
}

export async function getCoachMessagesUsedToday(userId: string): Promise<number> {
  const day = utcDayString();
  const key = coachChatMemoryKey(userId, day);
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    return memCounts.get(key) ?? 0;
  }
  try {
    const { getRedisClient } = await import('../config/redis.js');
    const redis = getRedisClient();
    if (!redis) return memCounts.get(key) ?? 0;
    const v = await redis.get(`coach:chat:${userId}:${day}`);
    return v ? Number(v) || 0 : 0;
  } catch {
    return memCounts.get(key) ?? 0;
  }
}

export async function incrementCoachMessagesToday(
  userId: string
): Promise<number> {
  const day = utcDayString();
  const key = coachChatMemoryKey(userId, day);
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    const n = (memCounts.get(key) ?? 0) + 1;
    memCounts.set(key, n);
    return n;
  }
  try {
    const { getRedisClient } = await import('../config/redis.js');
    const redis = getRedisClient();
    if (!redis) {
      const n = (memCounts.get(key) ?? 0) + 1;
      memCounts.set(key, n);
      return n;
    }
    const redisKey = `coach:chat:${userId}:${day}`;
    const n = await redis.incr(redisKey);
    if (n === 1) {
      await redis.expire(redisKey, secondsUntilUtcMidnight());
    }
    return n;
  } catch {
    const n = (memCounts.get(key) ?? 0) + 1;
    memCounts.set(key, n);
    return n;
  }
}

export async function assertCoachChatUnderLimit(params: {
  userId: string;
  role: string;
  subscription?: IUserSubscription | null;
}): Promise<{ ok: true; used: number; limit: number } | { ok: false; used: number; limit: number }> {
  if (coachUnlimitedRole(params.role)) {
    return { ok: true, used: 0, limit: -1 };
  }
  if (
    hasPaidProOrInvestor({
      role: params.role,
      subscription: params.subscription,
    })
  ) {
    return { ok: true, used: 0, limit: -1 };
  }
  const limit = coachFreeDailyMessageLimit();
  const used = await getCoachMessagesUsedToday(params.userId);
  if (used >= limit) {
    return { ok: false, used, limit };
  }
  return { ok: true, used, limit };
}

export async function recordCoachMessageSent(
  userId: string,
  role: string,
  subscription?: IUserSubscription | null
): Promise<void> {
  if (coachUnlimitedRole(role)) return;
  if (hasPaidProOrInvestor({ role, subscription })) return;
  await incrementCoachMessagesToday(userId);
}

function coachUnlimitedRole(role: string): boolean {
  if (String(process.env.COACH_CHAT_UNLIMITED ?? '').toLowerCase() === 'true') {
    return true;
  }
  return role === 'moderator' || role === 'super_admin';
}

/** Redis: brief dismissed for UTC day */
export async function isCoachBriefDismissed(
  userId: string,
  day = utcDayString()
): Promise<boolean> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return false;
  try {
    const { getRedisClient } = await import('../config/redis.js');
    const redis = getRedisClient();
    if (!redis) return false;
    const v = await redis.get(`coach:brief:dismiss:${userId}:${day}`);
    return v === '1';
  } catch {
    return false;
  }
}

export async function dismissCoachBrief(
  userId: string,
  day = utcDayString()
): Promise<void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return;
  try {
    const { getRedisClient } = await import('../config/redis.js');
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(
      `coach:brief:dismiss:${userId}:${day}`,
      '1',
      'EX',
      48 * 60 * 60
    );
  } catch {
    /* ignore */
  }
}
