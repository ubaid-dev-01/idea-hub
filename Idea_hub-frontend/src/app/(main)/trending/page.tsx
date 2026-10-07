'use client';

import { IdeaPostCard } from '@/components/feed/IdeaPostCard';
import { useTrendingIdeas } from '@/hooks/useIdeas';
import { useAuthStore } from '@/store/authStore';

export default function TrendingPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error, refetch } = useTrendingIdeas();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-skeleton-pulse rounded-2xl bg-surface2 dark:bg-[#242526]"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
        <p className="text-red-800 dark:text-red-200">
          {error instanceof Error ? error.message : 'Failed to load'}
        </p>
        <button
          type="button"
          className="mt-4 text-sm font-medium text-brand dark:text-indigo-400"
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <p className="text-center text-[var(--text-muted)]">No trending ideas yet.</p>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-[var(--text)]">Trending</h1>
      <div className="space-y-4">
        {data.map((idea) => (
          <IdeaPostCard key={idea._id} idea={idea} currentUserId={user?._id} />
        ))}
      </div>
    </div>
  );
}
