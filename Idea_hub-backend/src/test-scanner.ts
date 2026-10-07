/**
 * End-to-end scanner smoke test.
 *
 * Prerequisites: MongoDB, Redis, Firebase Admin env, running network access to Firebase RTDB.
 *
 * Run:
 *   npx tsx src/test-scanner.ts
 *
 * Or with Node 20+ env file:
 *   node --env-file=.env ./node_modules/tsx/dist/cli.mjs src/test-scanner.ts
 */

import mongoose from 'mongoose';
import { nanoid } from 'nanoid';
import type admin from 'firebase-admin';

import { db } from './config/firebase.js';
import { closeRedisConnection } from './config/redis.js';
import { Idea, User } from './models/index.js';
import { addScanJob, closeScanQueue } from './queues/scanner.queue.js';
import { createScannerWorker } from './workers/scanner.worker.js';

const TERMINAL_STATUSES = new Set([
  'published',
  'pending_review',
  'rejected',
]);

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

async function waitForScanComplete(
  ideaId: string,
  timeoutMs: number
): Promise<Record<string, unknown>> {
  const ref = db.ref(`scan_updates/${ideaId}`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ref.off();
      reject(new Error(`Timeout after ${timeoutMs}ms waiting for scan_updates`));
    }, timeoutMs);

    ref.on('value', (snap: admin.database.DataSnapshot) => {
      const val = snap.val() as Record<string, unknown> | null;
      if (!val) return;
      const progress = Number(val.progress);
      const status = val.status as string | undefined;
      if (progress === 100 && status && TERMINAL_STATUSES.has(status)) {
        clearTimeout(timer);
        ref.off();
        resolve(val);
      }
    });
  });
}

async function main(): Promise<void> {
  requireEnv('MONGODB_URI');
  requireEnv('FIREBASE_PROJECT_ID');
  requireEnv('FIREBASE_CLIENT_EMAIL');
  requireEnv('FIREBASE_PRIVATE_KEY');
  requireEnv('FIREBASE_DATABASE_URL');
  requireEnv('REDIS_URL');

  await mongoose.connect(process.env.MONGODB_URI!, { maxPoolSize: 10 });

  const suffix = nanoid(10).toLowerCase();
  const user = await User.create({
    username: `scan_test_${suffix}`,
    email: `scan_test_${suffix}@example.com`,
    passwordHash: 'TestPassword123!',
    fullName: 'Scanner Test User',
    bio: '',
    avatarUrl: '',
    status: 'active',
    isEmailVerified: true,
  });

  const idea = await Idea.create({
    authorId: user._id,
    title: 'Clean energy community microgrids',
    description:
      'A platform for neighbors to coordinate small-scale solar and battery sharing.',
    category: 'environment',
    tags: ['energy', 'community'],
    status: 'ai_scanning',
    visibility: 'public',
    media: [],
    collaboratorsOpen: false,
    requiredSkills: [],
    collaborators: [],
  });

  const worker = createScannerWorker();

  await addScanJob(idea._id.toString(), []);

  const firebaseSnapshot = await waitForScanComplete(idea._id.toString(), 120_000);

  const updated = await Idea.findById(idea._id).lean();
  if (!updated) {
    throw new Error('Idea missing after scan');
  }

  const status = updated.status;
  if (!TERMINAL_STATUSES.has(status)) {
    throw new Error(
      `Expected idea.status in ${[...TERMINAL_STATUSES].join(', ')}, got ${status}`
    );
  }

  console.log('--- Firebase scan_updates (final) ---');
  console.log(JSON.stringify(firebaseSnapshot, null, 2));

  console.log('--- MongoDB idea after scan ---');
  console.log(
    JSON.stringify(
      {
        _id: updated._id,
        status: updated.status,
        contentScanScore: updated.contentScanScore,
        contentScanReport: updated.contentScanReport,
        rejectionReason: updated.rejectionReason,
      },
      null,
      2
    )
  );

  await worker.close();
  await closeScanQueue();
  await mongoose.disconnect();
  await closeRedisConnection();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
