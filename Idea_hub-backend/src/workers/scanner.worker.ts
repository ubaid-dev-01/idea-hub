import { Worker, type Job } from 'bullmq';
import mongoose from 'mongoose';

import { requireRedisClient } from '../config/redis.js';
import { db } from '../config/firebase.js';
import { Idea, Notification } from '../models/index.js';
import type { ScanJobPayload } from '../queues/scanner.queue.js';
import { AggregateScanner } from '../services/scanners/AggregateScanner.js';
import { DocumentScanner } from '../services/scanners/DocumentScanner.js';
import { ImageScanner } from '../services/scanners/ImageScanner.js';
import { VideoScanner } from '../services/scanners/VideoScanner.js';
import { TextScanner } from '../services/scanners/TextScanner.js';
import type { MediaScanResult } from '../services/scanners/types.js';

function isDocumentMediaItem(item: ScanJobPayload['mediaItems'][number]): boolean {
  if (['pdf', 'doc', 'spreadsheet'].includes(item.mediaType)) return true;
  const mt = item.mimeType?.toLowerCase() ?? '';
  return (
    mt.includes('pdf') ||
    mt.includes('wordprocessingml') ||
    mt.includes('spreadsheetml') ||
    mt.includes('msword')
  );
}

export async function processScanJob(
  job: Job<ScanJobPayload>
): Promise<{
  ideaId: string;
  decision: 'flagged' | 'ok';
  score: number;
}> {
  const { ideaId, mediaItems } = job.data;

  const idea = await Idea.findById(ideaId);
  if (!idea) {
    throw new Error(`Idea ${ideaId} not found`);
  }

  await db.ref(`scan_updates/${ideaId}`).set({
    status: 'scanning_text',
    progress: 10,
    updatedAt: Date.now(),
  });

  const textScanner = new TextScanner();
  const textResult = await textScanner.scan({
    title: idea.title,
    description: idea.description,
    tags: idea.tags,
  });
  await job.updateProgress(25);

  const mediaResults: MediaScanResult[] = [];
  const imageScanner = new ImageScanner();
  const videoScanner = new VideoScanner();
  const docScanner = new DocumentScanner();

  for (let i = 0; i < mediaItems.length; i += 1) {
    const item = mediaItems[i];
    await db.ref(`scan_updates/${ideaId}`).update({
      status: `scanning_media_${i + 1}_of_${mediaItems.length}`,
      progress: 25 + Math.floor((i / Math.max(mediaItems.length, 1)) * 50),
    });

    const assetUrl = item.mediaUrl || item.firebaseUrl || '';
    if (!assetUrl) {
      continue;
    }

    let result: MediaScanResult | null = null;
    if (item.mediaType === 'image') {
      result = await imageScanner.scan(assetUrl);
    } else if (item.mediaType === 'video') {
      result = await videoScanner.scan(assetUrl, ideaId);
    } else if (isDocumentMediaItem(item)) {
      result = await docScanner.scan(assetUrl, item.mimeType);
    } else {
      continue;
    }

    mediaResults.push(result);

    const mediaObjectId = new mongoose.Types.ObjectId(item.mediaId);
    await Idea.updateOne(
      { _id: ideaId, 'media._id': mediaObjectId },
      {
        $set: {
          'media.$.scanStatus': result.score >= 0.5 ? 'approved' : 'rejected',
          'media.$.scanViolations': result.violations,
        },
      }
    );
  }

  await job.updateProgress(80);

  const aggregator = new AggregateScanner();
  const aggregate = aggregator.aggregate(textResult, mediaResults);
  const finalScore = aggregate.finalScore;

  const firstImage = mediaResults.find((r) => r.mediaType === 'image');
  const firstVideo = mediaResults.find((r) => r.mediaType === 'video');
  const firstPdf = mediaResults.find((r) => r.mediaType === 'pdf');
  const firstDoc = mediaResults.find((r) => r.mediaType === 'doc');

  const reportPayload = {
    textScore: textResult.score,
    imageScore: firstImage?.score ?? 1,
    videoScore: firstVideo?.score ?? 1,
    docScore: firstPdf?.score ?? firstDoc?.score ?? 1,
    violations: aggregate.allViolations,
    reviewRequired: aggregate.report.reviewRequired,
    scannedAt: new Date(),
  };

  /**
   * Instagram-style: ideas are created as `published` immediately.
   * - score >= 0.5: keep published, only persist scan scores (no admin step).
   * - score < 0.5: flag + make private so feed hides; staff reviews in admin queue.
   */
  const isSevereViolation = finalScore < 0.5;

  if (isSevereViolation) {
    await Idea.findByIdAndUpdate(ideaId, {
      $set: {
        status: 'flagged',
        visibility: 'private',
        contentScanScore: finalScore,
        contentScanReport: reportPayload,
        rejectionReason: `Content policy: ${aggregate.allViolations.slice(0, 3).join(', ')}`.slice(
          0,
          2000
        ),
      },
    });

    await db.ref(`scan_updates/${ideaId}`).set({
      status: 'flagged',
      score: finalScore,
      violations: aggregate.allViolations,
      reviewRequired: true,
      progress: 100,
      updatedAt: Date.now(),
    });

    const preview = aggregate.allViolations.slice(0, 2).join(', ');
    await Notification.create({
      recipientId: idea.authorId,
      senderId: null,
      type: 'admin_action',
      referenceId: idea._id,
      referenceType: 'idea',
      title: 'Your post was removed — violation detected',
      body:
        `Our automated review flagged this content (${preview}). You can appeal from your drafts or contact support.`.slice(
          0,
          500
        ),
      isRead: false,
      isPushSent: false,
      metadata: {
        violations: aggregate.allViolations,
        score: finalScore,
        flagged: true,
      },
    });
  } else {
    await Idea.findByIdAndUpdate(ideaId, {
      $set: {
        contentScanScore: finalScore,
        contentScanReport: reportPayload,
      },
    });

    if (
      String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() === 'true'
    ) {
      const { scheduleValidationRecalculate } = await import(
        '../services/ValidationEngine.js'
      );
      scheduleValidationRecalculate(ideaId);
    }

    await db.ref(`scan_updates/${ideaId}`).set({
      status: 'published',
      score: finalScore,
      violations: aggregate.allViolations,
      reviewRequired: aggregate.report.reviewRequired,
      progress: 100,
      updatedAt: Date.now(),
    });
  }

  const { scheduleIdeaMetadataRefresh } = await import(
    '../services/idea-metadata.service.js'
  );
  scheduleIdeaMetadataRefresh(ideaId);

  await job.updateProgress(100);

  return {
    ideaId,
    decision: isSevereViolation ? 'flagged' : 'ok',
    score: finalScore,
  };
}

export function createScannerWorker(): Worker<ScanJobPayload> {
  const redis = requireRedisClient();
  const worker = new Worker<ScanJobPayload>(
    'content-scan',
    processScanJob,
    {
      connection: redis,
      concurrency: 3,
      limiter: { max: 10, duration: 60_000 },
    }
  );

  worker.on('completed', (job) => {
    const rv = job.returnvalue as unknown;
    console.log(`[scanner] job ${job.id} completed`, rv);
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[scanner] job ${job?.id ?? 'unknown'} failed`,
      err?.message ?? err
    );
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[scanner] job ${jobId} stalled`);
  });

  return worker;
}
