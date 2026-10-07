import mongoose from 'mongoose';

import { getRedisClient } from '../config/redis.js';
import {
  formatUptime,
  getListenPort,
  getRuntimeMode,
  getRuntimeStartedAt,
  getUptimeSeconds,
} from '../lib/runtime-state.js';

const MONGO_STATE_LABEL: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function flagEnabled(name: string): boolean {
  return String(process.env[name] ?? '').toLowerCase() === 'true';
}

async function pingMongo(): Promise<{
  ok: boolean;
  pingMs: number | null;
  error: string | null;
}> {
  const state = mongoose.connection.readyState;
  if (state !== 1 || !mongoose.connection.db) {
    return { ok: false, pingMs: null, error: 'not connected' };
  }
  const t0 = Date.now();
  try {
    await mongoose.connection.db.admin().command({ ping: 1 });
    return { ok: true, pingMs: Date.now() - t0, error: null };
  } catch (err) {
    return {
      ok: false,
      pingMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function pingRedis(): Promise<{
  configured: boolean;
  ok: boolean;
  pingMs: number | null;
  error: string | null;
}> {
  const configured = Boolean(process.env.REDIS_URL?.trim());
  if (!configured) {
    return { configured: false, ok: false, pingMs: null, error: null };
  }
  const redis = getRedisClient();
  if (!redis) {
    return {
      configured: true,
      ok: false,
      pingMs: null,
      error: 'client unavailable (check REDIS_URL)',
    };
  }
  const t0 = Date.now();
  try {
    const pong = await redis.ping();
    return {
      configured: true,
      ok: pong === 'PONG',
      pingMs: Date.now() - t0,
      error: pong === 'PONG' ? null : `unexpected: ${pong}`,
    };
  } catch (err) {
    return {
      configured: true,
      ok: false,
      pingMs: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export type HealthReport = {
  ok: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  checkedAt: string;
  startedAt: string;
  uptime: { seconds: number; human: string };
  runtime: {
    mode: 'vercel' | 'node-server';
    nodeVersion: string;
    env: string;
    pid: number;
  };
  server: {
    port: number | null;
    region: string | null;
    deployment: string | null;
    url: string | null;
  };
  mongodb: {
    configured: boolean;
    state: string;
    readyState: number;
    connected: boolean;
    pingMs: number | null;
    database: string | null;
    host: string | null;
    error: string | null;
  };
  redis: {
    configured: boolean;
    connected: boolean;
    pingMs: number | null;
    error: string | null;
  };
  features: {
    validationEngine: boolean;
    gamification: boolean;
    aiCoach: boolean;
    liveRooms: boolean;
    backgroundCrons: boolean;
  };
  process: {
    memoryMb: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
};

export async function buildHealthReport(): Promise<HealthReport> {
  const startedAt = getRuntimeStartedAt();
  const uptimeSeconds = getUptimeSeconds();
  const mongoPing = await pingMongo();
  const redisPing = await pingRedis();
  const mongoState = mongoose.connection.readyState;
  const mongoConnected = mongoState === 1 && mongoPing.ok;
  const mongoConfigured = Boolean(process.env.MONGODB_URI?.trim());

  const redisOk = !redisPing.configured || redisPing.ok;

  let status: HealthReport['status'] = 'healthy';
  if (mongoConfigured && !mongoConnected) status = 'unhealthy';
  else if (redisPing.configured && !redisPing.ok) status = 'degraded';

  const mem = process.memoryUsage();

  return {
    ok: status !== 'unhealthy',
    status,
    service: '@ideahub/api',
    version: process.env.npm_package_version ?? '0.1.0',
    checkedAt: new Date().toISOString(),
    startedAt: startedAt.toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      human: formatUptime(uptimeSeconds),
    },
    runtime: {
      mode: getRuntimeMode(),
      nodeVersion: process.version,
      env: process.env.NODE_ENV ?? 'development',
      pid: process.pid,
    },
    server: {
      port: getListenPort(),
      region: process.env.VERCEL_REGION ?? null,
      deployment: process.env.VERCEL_URL ?? null,
      url: process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : getListenPort()
          ? `http://localhost:${getListenPort()}`
          : null,
    },
    mongodb: {
      configured: mongoConfigured,
      state: MONGO_STATE_LABEL[mongoState] ?? 'unknown',
      readyState: mongoState,
      connected: mongoConnected,
      pingMs: mongoPing.pingMs,
      database: mongoose.connection.name || null,
      host: mongoose.connection.host || null,
      error: mongoPing.error,
    },
    redis: {
      configured: redisPing.configured,
      connected: redisPing.ok,
      pingMs: redisPing.pingMs,
      error: redisPing.error,
    },
    features: {
      validationEngine: flagEnabled('ENABLE_VALIDATION_ENGINE'),
      gamification: flagEnabled('ENABLE_GAMIFICATION'),
      aiCoach: flagEnabled('ENABLE_AI_COACH'),
      liveRooms: flagEnabled('ENABLE_LIVE_ROOMS'),
      backgroundCrons: getRuntimeMode() === 'node-server',
    },
    process: {
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
    },
  };
}
