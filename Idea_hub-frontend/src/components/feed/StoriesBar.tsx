'use client';

import { useMemo, useRef, useState } from 'react';

import { StoryUploadModal } from '@/components/feed/StoryUploadModal';
import { StoryViewer } from '@/components/feed/StoryViewer';
import { useIsDesktopModal } from '@/hooks/useMediaQuery';
import { useStories } from '@/hooks/useStories';
import type { StoryDto } from '@/lib/api/stories.api';
import { ICONS } from '@/lib/icons';
import { useAuthStore } from '@/store/authStore';

type AuthorGroup = {
  authorId: string;
  username: string;
  avatarUrl?: string;
  stories: StoryDto[];
  coverUrl: string;
};

function authorMeta(story: StoryDto) {
  const a = story.authorId;
  if (a && typeof a === 'object') {
    return {
      id: a._id,
      username: a.username,
      avatarUrl: a.avatarUrl,
    };
  }
  return {
    id: typeof a === 'string' ? a : 'unknown',
    username: 'user',
    avatarUrl: undefined as string | undefined,
  };
}

function groupByAuthor(stories: StoryDto[]): AuthorGroup[] {
  const map = new Map<string, AuthorGroup>();
  for (const s of stories) {
    const meta = authorMeta(s);
    const existing = map.get(meta.id);
    const thumb = s.thumbnailUrl || s.mediaUrl;
    if (existing) {
      existing.stories.push(s);
    } else {
      map.set(meta.id, {
        authorId: meta.id,
        username: meta.username,
        avatarUrl: meta.avatarUrl,
        stories: [s],
        coverUrl: thumb,
      });
    }
  }
  return Array.from(map.values());
}

export function StoriesBar() {
  const user = useAuthStore((s) => s.user);
  const { data: stories, isLoading } = useStories();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktopModal();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    stories: StoryDto[];
    startIndex: number;
  } | null>(null);

  const groups = useMemo(() => groupByAuthor(stories ?? []), [stories]);

  const myGroup = useMemo(
    () => (user ? groups.find((g) => g.authorId === user._id) : undefined),
    [groups, user]
  );
  const others = useMemo(
    () => groups.filter((g) => g.authorId !== user?._id),
    [groups, user]
  );

  const scrollBy = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  const openGroup = (group: AuthorGroup) => {
    setViewer({ stories: group.stories, startIndex: 0 });
  };

  return (
    <div className="relative mb-4">
      {isDesktop ? (
        <>
          <button
            type="button"
            aria-label="Scroll left"
            className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 shadow-md md:block dark:bg-[#18191a]"
            onClick={() => scrollBy(-1)}
          >
            <ICONS.back size={18} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--surface)] p-2 shadow-md md:block dark:bg-[#18191a]"
            onClick={() => scrollBy(1)}
          >
            <ICONS.next size={18} />
          </button>
        </>
      ) : null}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto px-0 py-2 [-webkit-overflow-scrolling:touch] md:px-2"
      >
        {user ? (
          <div className="flex w-[76px] shrink-0 flex-col items-center gap-1.5">
            <div className="story-border-spin relative rounded-full p-[3px]">
              <button
                type="button"
                className="story-border-spin-inner relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden bg-[var(--surface)] dark:bg-[#18191a]"
                onClick={() => {
                  if (myGroup?.stories.length) openGroup(myGroup);
                  else setUploadOpen(true);
                }}
                aria-label="Your story"
              >
                {myGroup?.coverUrl || user.avatarUrl ? (
                  <div
                    className="h-14 w-14 rounded-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${myGroup?.coverUrl || user.avatarUrl})`,
                    }}
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-white shadow-inner">
                    <ICONS.post size={24} strokeWidth={2} />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="absolute bottom-0.5 right-0.5 z-[1] flex h-5 w-5 items-center justify-center rounded-full bg-[var(--lh-accent)] text-white ring-2 ring-[var(--surface)]"
                aria-label="Add story"
              >
                <ICONS.post size={12} strokeWidth={2.5} />
              </button>
            </div>
            <span className="max-w-[76px] truncate text-center text-[11px] font-medium text-[var(--text)]">
              Your story
            </span>
          </div>
        ) : null}

        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
              >
                <div className="h-[68px] w-[68px] animate-skeleton-pulse rounded-full bg-surface2 dark:bg-[#242526]" />
                <div className="h-3 w-12 animate-skeleton-pulse rounded bg-surface2" />
              </div>
            ))
          : others.map((group) => {
              const label = group.username.slice(0, 10);
              return (
                <button
                  key={group.authorId}
                  type="button"
                  onClick={() => openGroup(group)}
                  className="flex w-[76px] shrink-0 flex-col items-center gap-1.5"
                >
                  <div className="story-border-spin rounded-full p-[3px]">
                    <div
                      className="relative h-[68px] w-[68px] overflow-hidden rounded-full bg-surface2 ring-2 ring-[var(--surface)] dark:bg-[#242526]"
                      style={{
                        backgroundImage: `url(${group.coverUrl || group.avatarUrl || ''})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  </div>
                  <span className="max-w-[76px] truncate text-center text-[11px] font-medium text-[var(--text)]">
                    {label}
                  </span>
                </button>
              );
            })}
      </div>

      <StoryUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
      {viewer ? (
        <StoryViewer
          stories={viewer.stories}
          startIndex={viewer.startIndex}
          onClose={() => setViewer(null)}
        />
      ) : null}
    </div>
  );
}
