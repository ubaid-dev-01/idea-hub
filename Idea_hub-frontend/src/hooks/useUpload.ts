'use client';

import { useCallback, useState } from 'react';

import api, { isAxiosError } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';

function uploadErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return e instanceof Error ? e.message : 'Upload failed';
}

function logUploadFailure(
  file: File,
  e: unknown,
  message: string
): void {
  if (isAxiosError(e)) {
    console.error('[useUpload] POST /upload failed', {
      message,
      status: e.response?.status,
      responseBody: e.response?.data,
      file: { name: file.name, size: file.size, type: file.type },
    });
  } else {
    console.error('[useUpload] POST /upload failed', {
      message,
      err: e,
      file: { name: file.name, size: file.size, type: file.type },
    });
  }
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  /** Primary delivery URL (Cloudinary secure_url) */
  url?: string;
  publicId?: string;
  thumbnailUrl?: string;
  error?: string;
}

type UploadApiData = {
  cdnUrl: string;
  publicId: string;
  thumbnailUrl: string;
  mimeType: string;
  bytes: number;
  resourceType: string;
};

function fileKey(file: File): string {
  return `${file.name}:${file.size}`;
}

export function useUpload() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(
    () => new Map()
  );

  const uploadFile = useCallback(async (file: File, _folder?: string) => {
    const key = fileKey(file);

    setUploads((prev) => {
      const next = new Map(prev);
      next.set(key, { file, progress: 0, status: 'uploading' });
      return next;
    });

    const form = new FormData();
    form.append('file', file);

    try {
      const { data } = await api.post<ApiResponse<UploadApiData>>(
        '/upload',
        form,
        {
          onUploadProgress: (ev) => {
            if (ev.total && ev.total > 0) {
              const pct = Math.min(
                100,
                Math.round((ev.loaded / ev.total) * 100)
              );
              setUploads((prev) => {
                const next = new Map(prev);
                const cur = next.get(key);
                if (cur) {
                  next.set(key, { ...cur, progress: pct, status: 'uploading' });
                }
                return next;
              });
            }
          },
        }
      );

      if (!data.success || !data.data?.cdnUrl) {
        const msg = data.message || 'Upload failed';
        throw new Error(msg);
      }

      const { cdnUrl, publicId, thumbnailUrl } = data.data;

      setUploads((prev) => {
        const next = new Map(prev);
        next.set(key, {
          file,
          progress: 100,
          status: 'done',
          url: cdnUrl,
          publicId,
          thumbnailUrl: thumbnailUrl || cdnUrl,
        });
        return next;
      });

      return cdnUrl;
    } catch (e) {
      const message = uploadErrorMessage(e);
      logUploadFailure(file, e, message);
      setUploads((prev) => {
        const next = new Map(prev);
        next.set(key, {
          file,
          progress: 0,
          status: 'error',
          error: message,
        });
        return next;
      });
      // Surface the API-provided reason to the caller (e.g. EditProfileModal toast).
      throw new Error(message);
    }
  }, []);

  const uploadMany = useCallback(
    (files: File[], folder?: string) =>
      Promise.all(files.map((f) => uploadFile(f, folder))),
    [uploadFile]
  );

  const reset = useCallback(() => setUploads(new Map()), []);

  return {
    uploads: Array.from(uploads.values()),
    uploadFile,
    uploadMany,
    reset,
  };
}
