import { Redis } from 'ioredis';

import { logger } from '../lib/logger.js';

let client: Redis | null = null;

function looksLikeLocalRedis(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return /(^|\/\/)(127\.0\.0\.1|localhost)(:|\/|$)/i.test(url);
  }
}

/**
 * Shared ioredis client for BullMQ and app code. Returns null when REDIS_URL is unset
 * or (in production) points at localhost — avoids ECONNREFUSED spam on Render.
 */
export function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (process.env.NODE_ENV === 'production' && looksLikeLocalRedis(url)) {
    logger.warn(
      { service: 'redis' },
      'REDIS_URL points to localhost; ignoring Redis on production. Use your Render/Upstash Redis URL.'
    );
    return null;
  }

  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 8) return null;
        return Math.min(times * 150, 3000);
      },
    });

    client.on('error', (err: Error) => {
      logger.error({ err, service: 'redis' }, 'Redis connection error');
    });
    client.on('connect', () => {
      logger.info({ service: 'redis' }, 'Redis connected');
    });

    void client.connect().catch((err: Error) => {
      logger.error(
        { err, service: 'redis' },
        'Redis connect failed — check REDIS_URL host, port, TLS (rediss://), and password'
      );
    });
  }
  return client;
}

/** Use when Redis is mandatory (e.g. scanner worker process). */
export function requireRedisClient(): Redis {
  const c = getRedisClient();
  if (!c) {
    throw new Error(
      'REDIS_URL is not set. On Render: create a Redis instance (Render Redis, Upstash, etc.) and set REDIS_URL to the rediss:// or redis:// URL.'
    );
  }
  return c;
}

export async function closeRedisConnection(): Promise<void> {
  if (!client) return;
  try {
    await client.quit();
  } catch {
    /* ignore */
  }
  client = null;
}
