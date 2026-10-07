'use client';

import { useMemo } from 'react';

import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import type { IMedia } from '@/types/api';

function mediaUrl(m: IMedia): string {
  return m.cdnUrl || m.firebaseUrl || m.thumbnailUrl || '';
}

export function MediaPreviewModal({
  isOpen,
  onClose,
  media,
  title = 'Preview',
}: {
  isOpen: boolean;
  onClose: () => void;
  media: IMedia | null;
  title?: string;
}) {
  const url = useMemo(() => (media ? mediaUrl(media) : ''), [media]);

  const body = (() => {
    if (!media || !url) return null;

    if (media.mediaType === 'video') {
      return (
        <video
          src={url}
          className="h-[70dvh] w-full rounded-lg bg-black object-contain"
          controls
          playsInline
          autoPlay
        />
      );
    }

    if (media.mediaType === 'pdf') {
      return (
        <iframe
          title="PDF preview"
          src={url}
          className="h-[75dvh] w-full rounded-lg bg-white"
        />
      );
    }

    if (media.mediaType === 'doc') {
      const office = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        url
      )}`;
      return (
        <>
          <iframe
            title="Document preview"
            src={office}
            className="h-[75dvh] w-full rounded-lg bg-white"
          />
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs font-semibold text-brand dark:text-indigo-400"
          >
            Open in new tab
          </a>
        </>
      );
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-sm font-semibold text-brand dark:text-indigo-400"
      >
        Open media
      </a>
    );
  })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="full"
      className="md:max-w-4xl"
    >
      <div className={cn('p-4', !body && 'text-sm text-[var(--text-muted)]')}>
        {body ?? 'Nothing to preview.'}
      </div>
    </Modal>
  );
}

