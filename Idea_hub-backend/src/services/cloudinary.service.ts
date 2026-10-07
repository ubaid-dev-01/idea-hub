import { Readable } from 'node:stream';

import { v2 as cloudinary } from 'cloudinary';
import { fileTypeFromBuffer } from 'file-type';

import {
  assertImageAllowed,
  ContentBlockedError,
} from './groq-moderation.service.js';

const FOLDER = process.env.CLOUDINARY_FOLDER ?? 'ideahub';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

export type CloudinaryUploadKind = 'image' | 'video' | 'raw';

export class CloudinaryConfigError extends Error {
  constructor() {
    super(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.'
    );
    this.name = 'CloudinaryConfigError';
  }
}

function ensureConfigured(): void {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new CloudinaryConfigError();
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function classifyMime(mime: string): CloudinaryUploadKind {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return 'raw';
}

/**
 * Cloudinary's upload callback often passes `{ error: { message } }` or similar,
 * not an `Error` instance — normalize to a string for `new Error(...)`.
 */
function cloudinaryCallbackErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.length > 0) return o.message;
    const nested = o.error;
    if (nested && typeof nested === 'object') {
      const e = nested as Record<string, unknown>;
      if (typeof e.message === 'string' && e.message.length > 0) return e.message;
    }
    if (typeof o.http_code === 'number') {
      return `Cloudinary error (HTTP ${o.http_code})`;
    }
  }
  try {
    return `Cloudinary: ${JSON.stringify(err)}`;
  } catch {
    return 'Cloudinary upload failed';
  }
}

export type UploadToCloudinaryResult = {
  cdnUrl: string;
  publicId: string;
  thumbnailUrl: string;
  resourceType: string;
  bytes: number;
  mimeType: string;
};

export { ContentBlockedError };

/**
 * Validates magic bytes, uploads to Cloudinary, returns delivery URL + publicId for deletion.
 */
export async function uploadToCloudinary(input: {
  buffer: Buffer;
  originalName: string;
}): Promise<UploadToCloudinaryResult> {
  ensureConfigured();

  const head = input.buffer.subarray(0, Math.min(input.buffer.length, 64 * 1024));
  const detected = await fileTypeFromBuffer(head);

  let effectiveMime: string | undefined = detected?.mime;
  if (!effectiveMime) {
    const lower = input.originalName.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg'))
      effectiveMime = 'image/jpeg';
    else if (lower.endsWith('.png')) effectiveMime = 'image/png';
    else if (lower.endsWith('.webp')) effectiveMime = 'image/webp';
    else if (lower.endsWith('.gif')) effectiveMime = 'image/gif';
    else if (lower.endsWith('.avif')) effectiveMime = 'image/avif';
    else if (lower.endsWith('.heic') || lower.endsWith('.heif'))
      effectiveMime = 'image/heic';
    else if (lower.endsWith('.bmp')) effectiveMime = 'image/bmp';
    else if (lower.endsWith('.tif') || lower.endsWith('.tiff'))
      effectiveMime = 'image/tiff';
    else if (lower.endsWith('.pdf')) effectiveMime = 'application/pdf';
    else if (lower.endsWith('.docx'))
      effectiveMime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (lower.endsWith('.doc'))
      effectiveMime = 'application/msword' as const;
  }

  if (!effectiveMime || !ALLOWED_MIME.has(effectiveMime)) {
    throw new Error(
      `Unsupported or unverified file type${detected?.mime ? `: ${detected.mime}` : ''}`
    );
  }

  // Groq Llama Guard — block unsafe images before they hit Cloudinary.
  if (effectiveMime.startsWith('image/')) {
    await assertImageAllowed({
      buffer: input.buffer,
      mimeType: effectiveMime,
    });
  }

  const resourceType = classifyMime(effectiveMime);
  const uploadOptions: Record<string, unknown> = {
    folder: FOLDER,
    resource_type: resourceType === 'raw' ? 'raw' : resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  };

  if (resourceType === 'video') {
    uploadOptions.eager = [
      { width: 640, height: 360, crop: 'fill', format: 'jpg' },
    ];
    uploadOptions.eager_async = false;
  }

  type UploadResult = {
    secure_url: string;
    public_id: string;
    resource_type: string;
    bytes?: number;
    eager?: Array<{ secure_url?: string }>;
  };

  const result = await new Promise<UploadResult>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream.bind(cloudinary.uploader);
    const stream = upload(
      uploadOptions as Record<string, unknown>,
      (err: unknown, res?: UploadResult) => {
        if (err || !res) {
          if (err) {
            reject(
              err instanceof Error
                ? err
                : new Error(cloudinaryCallbackErrorMessage(err))
            );
          } else {
            reject(new Error('Cloudinary returned no upload result'));
          }
        } else {
          resolve(res);
        }
      }
    );
    Readable.from(input.buffer).pipe(stream);
  });

  const cdnUrl = result.secure_url;
  const publicId = result.public_id;
  let thumbnailUrl = '';
  if (resourceType === 'image') {
    thumbnailUrl = cdnUrl;
  } else if (
    resourceType === 'video' &&
    Array.isArray(result.eager) &&
    result.eager[0]?.secure_url
  ) {
    thumbnailUrl = result.eager[0].secure_url;
  }

  return {
    cdnUrl,
    publicId,
    thumbnailUrl,
    resourceType: result.resource_type,
    bytes: result.bytes ?? input.buffer.length,
    mimeType: effectiveMime,
  };
}

export async function destroyFromCloudinary(
  publicId: string,
  mediaType: string
): Promise<void> {
  ensureConfigured();
  let resourceType: 'image' | 'video' | 'raw' = 'raw';
  if (mediaType === 'image') resourceType = 'image';
  else if (mediaType === 'video') resourceType = 'video';

  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}
