import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';

import { logger } from '../lib/logger.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  CloudinaryConfigError,
  ContentBlockedError,
  uploadToCloudinary,
} from '../services/cloudinary.service.js';

const log = logger.child({ module: 'upload' });

function uploadRouteErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  try {
    return JSON.stringify(e);
  } catch {
    return 'Upload failed';
  }
}

export const uploadRouter = Router();

const maxBytes = Number(process.env.UPLOAD_MAX_BYTES ?? 524_288_000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes },
});

function requireDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      data: null,
    });
    return;
  }
  next();
}

/** Multer's types can disagree with Express when nested @types/express-serve-static-core exists (e.g. Yarn on Render). */
type MulterSingleHandler = (
  req: Request,
  res: Response,
  cb: (err?: unknown) => void
) => void;

function parseSingleFile(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  (upload.single('file') as MulterSingleHandler)(req, res, (err: unknown) => {
    if (err) {
      const message =
        err instanceof multer.MulterError
          ? err.code === 'LIMIT_FILE_SIZE'
            ? 'File too large'
            : err.message
          : uploadRouteErrorMessage(err);
      log.warn(
        {
          code: err instanceof multer.MulterError ? err.code : undefined,
          field: err instanceof multer.MulterError ? err.field : undefined,
          contentType: req.headers['content-type'],
        },
        message
      );
      res.status(400).json({
        success: false,
        message,
        data: null,
      });
      return;
    }
    next();
  });
}

uploadRouter.post(
  '/',
  requireDb,
  requireAuth,
  parseSingleFile,
  async (req, res) => {
    const userId = res.locals.authUserId;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Invalid session',
        data: null,
      });
      return;
    }

    if (!req.file?.buffer) {
      log.warn(
        {
          contentType: req.headers['content-type'],
          hasFile: Boolean(req.file),
          originalname: req.file?.originalname,
          bodyKeys:
            req.body && typeof req.body === 'object'
              ? Object.keys(req.body)
              : [],
        },
        'missing file buffer'
      );
      res.status(400).json({
        success: false,
        message: 'Missing file field "file"',
        data: null,
      });
      return;
    }

    try {
      const out = await uploadToCloudinary({
        buffer: req.file.buffer,
        originalName: req.file.originalname || 'upload.bin',
      });
      res.status(201).json({
        success: true,
        message: 'Uploaded',
        data: {
          cdnUrl: out.cdnUrl,
          publicId: out.publicId,
          thumbnailUrl: out.thumbnailUrl,
          mimeType: out.mimeType,
          bytes: out.bytes,
          resourceType: out.resourceType,
        },
      });
    } catch (e) {
      if (e instanceof ContentBlockedError) {
        log.warn(
          { categories: e.categories, originalname: req.file?.originalname },
          'upload blocked by Groq content filter'
        );
        res.status(400).json({
          success: false,
          message: e.message,
          data: { categories: e.categories },
        });
        return;
      }
      if (e instanceof CloudinaryConfigError) {
        log.error({ err: e.message }, 'cloudinary not configured');
        res.status(503).json({
          success: false,
          message: e.message,
          data: null,
        });
        return;
      }
      const msg = uploadRouteErrorMessage(e);
      log.error(
        {
          message: msg,
          originalname: req.file?.originalname,
          bytes: req.file?.buffer?.length,
          err: e instanceof Error ? e.message : e,
        },
        'cloudinary or validation failed'
      );
      res.status(400).json({
        success: false,
        message: msg,
        data: null,
      });
    }
  }
);
