import { createHash } from 'node:crypto';

import { getRedisClient } from '../config/redis.js';

const PREFIX = 'jwt_refresh_deny:';
const TTL_SEC = 60 * 60 * 24 * 8;

function redisKey(token: string): string {
  const h = createHash('sha256').update(token, 'utf8').digest('hex');
  return `${PREFIX}${h}`;
}

export async function denyRefreshToken(token: string): Promise<void> {
  if (!process.env.REDIS_URL) return;
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(redisKey(token), '1', 'EX', TTL_SEC);
  } catch (e) {
    console.warn('[token-denylist] deny failed:', e);
  }
}

export async function isRefreshTokenDenied(token: string): Promise<boolean> {
  if (!process.env.REDIS_URL) return false;
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    const v = await redis.get(redisKey(token));
    return v === '1';
  } catch {
    return false;
  }
}
