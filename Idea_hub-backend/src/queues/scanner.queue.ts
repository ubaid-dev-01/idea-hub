import { Queue } from 'bullmq';

import { getRedisClient } from '../config/redis.js';
import { logger } from '../lib/logger.js';

export interface ScanJobPayload {
  ideaId: string;
  mediaItems: Array<{
    mediaId: string;
    /** HTTPS URL (Cloudinary, Firebase, etc.) */
    mediaUrl: string;
    /** @deprecated Prefer mediaUrl */
    firebaseUrl?: string;
    mediaType: string;
    mimeType: string;
  }>;
}

let scanQueue: Queue<ScanJobPayload> | null = null;

function ensureScanQueue(): Queue<ScanJobPayload> | null {
  const redis = getRedisClient();
  if (!redis) return null;
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobPayload>('content-scan', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return scanQueue;
}

export async function addScanJob(
  ideaId: string,
  mediaItems: ScanJobPayload['mediaItems'],
  options?: { priority?: number }
): Promise<void> {
  const q = ensureScanQueue();
  if (!q) {
    logger.debug(
      { ideaId, mediaCount: mediaItems.length },
      'skip content-scan job: REDIS_URL not configured'
    );
    return;
  }
  await q.add(
    'scan-idea',
    { ideaId, mediaItems },
    {
      jobId: `scan-${ideaId}-${Date.now()}`,
      ...(typeof options?.priority === 'number'
        ? { priority: options.priority }
        : {}),
    }
  );
}

export async function closeScanQueue(): Promise<void> {
  if (!scanQueue) return;
  await scanQueue.close();
  scanQueue = null;
}
