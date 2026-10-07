'use client';

import { FileText } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/components/ui/cn';
import type { IMedia } from '@/types/api';

export function MediaViewer({ media }: { media: IMedia[] }) {
  const [active, setActive] = useState(0);
  const item = media[active];
  if (!item) return null;

  const src = item.cdnUrl || item.firebaseUrl;

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-black/5 dark:bg-black/20',
          item.mediaType === 'video' && 'aspect-video'
        )}
      >
        {item.mediaType === 'image' ? (
          <Image
            src={src}
            alt=""
            width={1200}
            height={675}
            className="max-h-[480px] w-auto object-contain"
            unoptimized
          />
        ) : item.mediaType === 'video' ? (
          <video
            src={src}
            controls
            className="max-h-[480px] w-full"
            playsInline
          />
        ) : item.mediaType === 'pdf' ? (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 p-8 text-brand"
          >
            <FileText className="h-12 w-12" />
            Open PDF
          </a>
        ) : (
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-brand underline"
          >
            Download file
          </a>
        )}
      </div>
      {media.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {media.map((m, i) => (
            <button
              key={m._id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-lg border px-3 py-1 text-xs',
                i === active
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              )}
            >
              {m.mediaType} {i + 1}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
