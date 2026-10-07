'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useState } from 'react';

import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { ICONS } from '@/lib/icons';
import { pushWithViewTransition } from '@/lib/viewTransitions';
import type { IIdea, IMedia } from '@/types/api';

import { IMAGE_BLUR_DATA_URL, mediaUrl } from './constants';

function IdeaPostMediaInner({
  idea,
  playingId,
  setPlayingId,
  detailHref,
  isDesktop,
}: {
  idea: IIdea;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  detailHref: string;
  isDesktop: boolean;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<IMedia | null>(null);
  const visuals = idea.media.filter(
    (m) => m.mediaType === 'image' || m.mediaType === 'video'
  );
  const docs = idea.media.filter(
    (m) => m.mediaType === 'pdf' || m.mediaType === 'doc'
  );

  const renderGrid = () => {
    if (!visuals.length) return null;
    const n = visuals.length;
    const first = visuals[0]!;
    if (n === 1) {
      const m = first;
      const url = mediaUrl(m);
      if (m.mediaType === 'video') {
        const isPlaying = playingId === m._id;
        return (
          <div className="relative aspect-[4/3] w-full rounded-none bg-black xl:rounded-xl">
            {isPlaying ? (
              <video
                src={url}
                className="h-full w-full object-contain"
                controls
                playsInline
                autoPlay
              />
            ) : (
              <>
                {m.thumbnailUrl || url ? (
                  <Image
                    src={m.thumbnailUrl || url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1279px) 100vw, 42rem"
                    unoptimized
                    placeholder="blur"
                    blurDataURL={IMAGE_BLUR_DATA_URL}
                  />
                ) : null}
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-black/30"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlayingId(m._id);
                  }}
                  aria-label="Play video"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
                    <ICONS.video size={28} />
                  </span>
                </button>
              </>
            )}
          </div>
        );
      }
      return (
        <div className="relative aspect-[4/3] w-full rounded-none bg-surface2 dark:bg-black xl:rounded-xl">
          <Image
            src={url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 1279px) 100vw, 42rem"
            unoptimized={url.includes('localhost')}
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_DATA_URL}
          />
        </div>
      );
    }
    if (n === 2) {
      return (
        <div className="grid grid-cols-2 gap-0.5">
          {visuals.map((m) => (
            <div
              key={m._id}
              className="relative aspect-square bg-surface2 dark:bg-black"
            >
              <Image
                src={mediaUrl(m)}
                alt=""
                fill
                className="object-cover"
                sizes="50vw"
                unoptimized
                placeholder="blur"
                blurDataURL={IMAGE_BLUR_DATA_URL}
              />
            </div>
          ))}
        </div>
      );
    }
    if (n === 3) {
      const [a, b, c] = visuals;
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5">
          <div className="relative row-span-2 aspect-[2/3] bg-surface2 dark:bg-black">
            <Image
              src={mediaUrl(a)}
              alt=""
              fill
              className="object-cover"
              sizes="50vw"
              unoptimized
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
            />
          </div>
          <div className="relative aspect-square bg-surface2 dark:bg-black">
            <Image
              src={mediaUrl(b)}
              alt=""
              fill
              className="object-cover"
              unoptimized
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
            />
          </div>
          <div className="relative aspect-square bg-surface2 dark:bg-black">
            <Image
              src={mediaUrl(c)}
              alt=""
              fill
              className="object-cover"
              unoptimized
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
            />
          </div>
        </div>
      );
    }
    const shown = visuals.slice(0, 4);
    const extra = visuals.length - 4;
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {shown.map((m, idx) => (
          <div
            key={m._id}
            className="relative aspect-square bg-surface2 dark:bg-black"
          >
            <Image
              src={mediaUrl(m)}
              alt=""
              fill
              className="object-cover"
              unoptimized
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
            />
            {idx === 3 && extra > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-2xl font-bold text-white">
                +{extra}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const grid = renderGrid();

  return (
    <div className="overflow-hidden border-t-0 border-[var(--color-border)] dark:border-gray-700 xl:rounded-xl xl:border-t">
      {grid ? (
        <Link
          href={detailHref}
          scroll={false}
          onClick={(e) => {
            if (!isDesktop) {
              e.preventDefault();
              pushWithViewTransition(router, detailHref);
            }
          }}
          className="block"
        >
          {grid}
        </Link>
      ) : null}
      {docs.map((d) => (
        <div
          key={d._id}
          className="mx-4 my-3 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 dark:border-gray-700 dark:bg-gray-800 xl:mx-6"
        >
          <ICONS.pdf className="shrink-0 text-blue-500" size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Document</p>
            <p className="text-xs text-[var(--text-muted)]">
              {d.mimeType} ·{' '}
              {d.fileSizeBytes
                ? `${Math.round(d.fileSizeBytes / 1024)} KB`
                : 'File'}
            </p>
            <button
              type="button"
              onClick={() => setPreview(d)}
              className="mt-2 inline-block text-left text-xs font-semibold text-brand hover:underline dark:text-indigo-400"
            >
              Open
            </button>
          </div>
        </div>
      ))}
      <MediaPreviewModal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        media={preview}
        title="Attachment preview"
      />
    </div>
  );
}

export const IdeaPostMedia = memo(IdeaPostMediaInner);
