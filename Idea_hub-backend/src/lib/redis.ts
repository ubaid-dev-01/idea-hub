import type { Redis } from 'ioredis';

import {
  closeRedisConnection,
  getRedisClient,
} from '../config/redis.js';

/** @deprecated Prefer getRedisClient from config/redis.js */
export function getRedis(): Redis | null {
  return getRedisClient();
}

export async function closeRedis(): Promise<void> {
  await closeRedisConnection();
}
