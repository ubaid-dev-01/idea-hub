'use client';

import { useEffect, useMemo, useState } from 'react';

import type { StoryDto } from '@/lib/api/stories.api';
import { ICONS } from '@/lib/icons';
import { useAuthStore } from '@/store/authStore';
import { useDeleteStory } from '@/hooks/useStories';

function authorOf(story: StoryDto) {
  const a = story.authorId;
  if (a && typeof a === 'object') return a;
  return null;
}

export function StoryViewer({
  stories: initialStories,
  startIndex,
  onClose,
}: {
  stories: StoryDto[];
  startIndex: number;
  onClose: () => void;
}) {
  const me = useAuthStore((s) => s.user);
  const del = useDeleteStory();
  const [stories, setStories] = useState(initialStories);
  const [index, setIndex] = useState(
    Math.min(startIndex, Math.max(0, initialStories.length - 1))
  );

  const story = stories[index];
  const author = story ? authorOf(story) : null;
  const isMine =
    Boolean(me?._id) &&
    (author?._id === me?._id ||
      (typeof story?.authorId === 'string' && story.authorId === me?._id));

  const progress = useMemo(() => {
    if (!stories.length) return 0;
    return ((index + 1) / stories.length) * 100;
  }, [index, stories.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setIndex((i) => Math.min(stories.length - 1, i + 1));
      }
      if (e.key === 'ArrowLeft') {
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, stories.length]);

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[130] flex flex-col bg-black">
      <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-3 pb-8 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mb-3 h-0.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full bg-white transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-2 text-white">
          <div
            className="h-8 w-8 shrink-0 rounded-full bg-white/20 bg-cover bg-center"
            style={
              author?.avatarUrl
                ? { backgroundImage: `url(${author.avatarUrl})` }
                : undefined
            }
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {author?.username ?? 'Story'}
            </p>
            <p className="text-[10px] text-white/70">Expires in 24h</p>
          </div>
          {isMine ? (
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-xs text-red-300 hover:bg-white/10"
              disabled={del.isPending}
              onClick={() => {
                void del.mutateAsync(story._id).then(() => {
                  setStories((prev) => {
                    const next = prev.filter((s) => s._id !== story._id);
                    if (next.length === 0) {
                      onClose();
                      return next;
                    }
                    setIndex((i) => Math.min(i, next.length - 1));
                    return next;
                  });
                });
              }}
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="Close"
          >
            <ICONS.clear size={20} />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="absolute inset-y-0 left-0 z-[5] w-1/3"
        aria-label="Previous"
        onClick={() => setIndex((i) => Math.max(0, i - 1))}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-[5] w-1/3"
        aria-label="Next"
        onClick={() => {
          if (index >= stories.length - 1) onClose();
          else setIndex((i) => i + 1);
        }}
      />

      <div className="flex flex-1 items-center justify-center px-2 pb-16 pt-20">
        {story.mediaType === 'video' ? (
          <video
            key={story._id}
            src={story.mediaUrl}
            className="max-h-full max-w-full object-contain"
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={story._id}
            src={story.mediaUrl}
            alt={story.caption || 'Story'}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      {story.caption ? (
        <p className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 text-center text-sm text-white">
          {story.caption}
        </p>
      ) : null}
    </div>
  );
}
