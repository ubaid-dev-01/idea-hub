'use client';

import { IdeaCard, IdeaCardSkeleton } from '@/components/idea/IdeaCard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { IIdea } from '@/types/api';

export function IdeaFeed({
  ideas,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  currentUserId,
  emptyMessage = 'No ideas yet. Be the first to share!',
}: {
  ideas: IIdea[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  currentUserId?: string;
  emptyMessage?: string;
}) {
  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    { enabled: hasNextPage }
  );

  if (isLoading) {
    return (
      <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <IdeaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!ideas.length) {
    return (
      <div
        className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-20 text-center text-sm text-[var(--text-muted)] dark:border-cyan-500/20 dark:bg-[#0b111b]/50 dark:text-slate-400 dark:shadow-[inset_0_0_40px_rgba(0,242,255,0.03)]"
      >
        <p className="mx-auto max-w-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea._id}
            idea={idea}
            currentUserId={currentUserId}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {isFetchingNextPage ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <IdeaCardSkeleton />
          <IdeaCardSkeleton />
        </div>
      ) : null}
    </>
  );
}
