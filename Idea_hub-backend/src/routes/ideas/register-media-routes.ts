import type { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';

import { requireAuth } from '../../middleware/require-auth.js';
import { Idea } from '../../models/index.js';
import {
  CloudinaryConfigError,
  ContentBlockedError,
  destroyFromCloudinary,
  uploadToCloudinary,
} from '../../services/cloudinary.service.js';
import { MEDIA_TYPES } from './constants.js';
import { mapIdeasForPublicApi } from './map-public.js';
import { requireDb } from './guards.js';

const maxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? 524_288_000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
});

function guessMediaType(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  if (mime.startsWith('audio/')) return 'audio';
  return 'link';
}

type MulterSingleHandler = (
  req: import('express').Request,
  res: import('express').Response,
  cb: (err?: unknown) => void
) => void;

export function registerMediaRoutes(ideasRouter: Router): void {
  ideasRouter.post(
    '/:id/media',
    requireDb,
    requireAuth,
    (req, res, next) => {
      (upload.single('file') as MulterSingleHandler)(req, res, (err) => {
        if (err) {
          res.status(400).json({
            success: false,
            message: err instanceof Error ? err.message : 'Upload failed',
            data: null,
          });
          return;
        }
        next();
      });
    },
    async (req, res) => {
      const { id } = req.params;
      const userId = res.locals.authUserId;

      if (!userId || !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          data: null,
        });
        return;
      }

      const idea = await Idea.findById(id);
      if (!idea || String(idea.authorId) !== userId) {
        res.status(404).json({
          success: false,
          message: 'Idea not found',
          data: null,
        });
        return;
      }

      if (idea.status !== 'published') {
        res.status(400).json({
          success: false,
          message: 'Media can only be added to published ideas',
          data: null,
        });
        return;
      }

      const file = req.file;
      if (!file?.buffer?.length) {
        res.status(400).json({
          success: false,
          message: 'file is required',
          data: null,
        });
        return;
      }

      try {
        const uploaded = await uploadToCloudinary({
          buffer: file.buffer,
          originalName: file.originalname || 'upload',
        });
        const mediaType = guessMediaType(uploaded.mimeType);
        if (!MEDIA_TYPES.has(mediaType)) {
          res.status(400).json({
            success: false,
            message: 'Unsupported media type',
            data: null,
          });
          return;
        }

        idea.media.push({
          mediaType: mediaType as 'image',
          firebaseUrl: '',
          cdnUrl: uploaded.cdnUrl,
          publicId: uploaded.publicId,
          thumbnailUrl: uploaded.thumbnailUrl,
          fileSizeBytes: uploaded.bytes,
          mimeType: uploaded.mimeType,
          durationSeconds: 0,
          scanStatus: 'pending',
          scanViolations: [],
          metadata: {},
          uploadedAt: new Date(),
        } as unknown as (typeof idea.media)[number]);
        await idea.save();

        const wantsScan = Boolean(process.env.REDIS_URL);
        if (wantsScan) {
          const sub = idea.media[idea.media.length - 1];
          if (sub) {
            try {
              const { addScanJob } = await import('../../queues/scanner.queue.js');
              void addScanJob(
                idea._id.toString(),
                [
                  {
                    mediaId: String(sub._id),
                    mediaUrl: String(sub.cdnUrl),
                    mediaType: sub.mediaType,
                    mimeType: sub.mimeType,
                  },
                ],
                { priority: 5 }
              ).catch((err) => console.error('[ideas] media scan queue', err));
            } catch {
              /* queue unavailable */
            }
          }
        }

        const fresh = await Idea.findById(id);
        if (!fresh) {
          res.status(500).json({
            success: false,
            message: 'Upload failed',
            data: null,
          });
          return;
        }
        const [payload] = await mapIdeasForPublicApi([fresh], userId);
        res.status(201).json({
          success: true,
          message: 'Uploaded',
          data: payload,
        });
      } catch (err) {
        if (err instanceof ContentBlockedError) {
          res.status(400).json({
            success: false,
            message: err.message,
            data: { categories: err.categories },
          });
          return;
        }
        const message =
          err instanceof CloudinaryConfigError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Upload failed';
        res.status(err instanceof CloudinaryConfigError ? 503 : 400).json({
          success: false,
          message,
          data: null,
        });
      }
    }
  );

  ideasRouter.delete(
    '/:id/media/:mediaId',
    requireDb,
    requireAuth,
    async (req, res) => {
      const { id, mediaId } = req.params;
      const userId = res.locals.authUserId;

      if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(id) ||
        !mongoose.Types.ObjectId.isValid(mediaId)
      ) {
        res.status(400).json({
          success: false,
          message: 'Invalid request',
          data: null,
        });
        return;
      }

      const idea = await Idea.findById(id);
      if (!idea || String(idea.authorId) !== userId) {
        res.status(404).json({
          success: false,
          message: 'Idea not found',
          data: null,
        });
        return;
      }

      const idx = idea.media.findIndex((m) => String(m._id) === mediaId);
      if (idx === -1) {
        res.status(404).json({
          success: false,
          message: 'Media not found',
          data: null,
        });
        return;
      }
      const item = idea.media[idx]!;
      const publicId = String(item.publicId ?? '').trim();
      if (publicId) {
        try {
          await destroyFromCloudinary(publicId, item.mediaType);
        } catch (err) {
          console.warn('[ideas] cloudinary destroy', err);
        }
      }
      idea.media.splice(idx, 1);
      await idea.save();

      const fresh = await Idea.findById(id);
      if (!fresh) {
        res.json({ success: true, message: 'Deleted', data: null });
        return;
      }
      const [payload] = await mapIdeasForPublicApi([fresh], userId);
      res.json({
        success: true,
        message: 'Deleted',
        data: payload,
      });
    }
  );
}
