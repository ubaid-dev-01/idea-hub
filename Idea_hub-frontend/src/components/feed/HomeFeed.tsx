'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { CreateIdeaBox } from '@/components/feed/CreateIdeaBox';
import { IdeaPostCard } from '@/components/feed/IdeaPostCard';
import { DailyBriefCard } from '@/components/coach/DailyBriefCard';
import { LiveNowStrip } from '@/components/live/LiveNowStrip';
import { StoriesBar } from '@/components/feed/StoriesBar';
import { cn } from '@/components/ui/cn';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { IIdea } from '@/types/api';

function PostSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] dark:border-slate-700/50 dark:bg-[#18191a]">
      <div className="flex gap-3 p-4">
        <div className="h-10 w-10 animate-skeleton-pulse rounded-full bg-surface2 dark:bg-[#242526]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 animate-skeleton-pulse rounded bg-surface2" />
          <div className="h-3 w-1/4 animate-skeleton-pulse rounded bg-surface2" />
        </div>
      </div>
      <div className="aspect-[4/3] animate-skeleton-pulse bg-surface2 dark:bg-[#242526]" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-skeleton-pulse rounded bg-surface2" />
        <div className="h-3 w-full animate-skeleton-pulse rounded bg-surface2" />
      </div>
    </div>
  );
}

export function HomeFeed({
  ideas,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  currentUserId,
  activeTag,
}: {
  ideas: IIdea[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  currentUserId?: string;
  activeTag?: string;
}) {
  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    { enabled: hasNextPage }
  );

  const sorted = useMemo(() => {
    return [...ideas].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [ideas]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <StoriesBar />
        <DailyBriefCard />
        <LiveNowStrip />
        <CreateIdeaBox />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-4">
        <StoriesBar />
        <DailyBriefCard />
        <LiveNowStrip />
        <CreateIdeaBox />
        {activeTag ? (
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-brand/5 px-4 py-3 text-sm dark:border-slate-700/50">
            <span>
              Filter: <span className="font-bold text-brand">#{activeTag}</span>
            </span>
            <Link href="/feed" className="font-semibold text-brand hover:underline">
              Clear
            </Link>
          </div>
        ) : null}
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center dark:border-slate-700/50 dark:bg-[#18191a]">
          <p className="text-sm font-medium text-[var(--text-muted)]">
            {activeTag
              ? `No ideas with #${activeTag} in this feed view.`
              : 'No ideas in your feed yet.'}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {activeTag
              ? 'Try another tag or clear the filter.'
              : 'Follow people or post the first idea.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <StoriesBar />
      <DailyBriefCard />
      <LiveNowStrip />
      <CreateIdeaBox />
      {activeTag ? (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-brand/5 px-4 py-3 text-sm dark:border-slate-700/50">
          <span>
            Filter: <span className="font-bold text-brand">#{activeTag}</span>
          </span>
          <Link href="/feed" className="font-semibold text-brand hover:underline">
            Clear
          </Link>
        </div>
      ) : null}
      {sorted.map((idea) => (
        <div
          key={idea._id}
          className={cn(idea._id.startsWith('temp-') && 'animate-post-enter')}
        >
          <IdeaPostCard idea={idea} currentUserId={currentUserId} />
        </div>
      ))}
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage ? <PostSkeleton /> : null}
    </div>
  );
}
