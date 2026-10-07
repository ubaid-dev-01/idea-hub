'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { IdeaPostCard } from '@/components/feed/IdeaPostCard';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usersApi } from '@/lib/api/users.api';
import { useAuthStore } from '@/store/authStore';

function Content() {
  const user = useAuthStore((s) => s.user);
  const q = useInfiniteQuery({
    queryKey: ['saved-ideas'],
    queryFn: ({ pageParam }) =>
      usersApi.getSavedIdeas(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor,
  });

  const ideas = q.data?.pages.flatMap((p) => p.ideas) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => {
      if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
    },
    { enabled: q.hasNextPage }
  );

  if (q.isLoading) {
    return (
      <p className="text-center text-sm text-[var(--text-muted)]">Loading…</p>
    );
  }

  if (!ideas.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center dark:border-slate-700/50">
        <p className="text-sm text-[var(--text-muted)]">
          No saved ideas yet. Bookmark posts from your feed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ideas.map((idea) => (
        <IdeaPostCard
          key={idea._id}
          idea={{ ...idea, saved: true }}
          currentUserId={user?._id}
        />
      ))}
      <div ref={sentinelRef} className="h-8" />
    </div>
  );
}

export default function SavedPage() {
  return (
    <AuthGuard>
      <h1 className="mb-4 text-xl font-bold text-[var(--text)]">Saved</h1>
      <Content />
    </AuthGuard>
  );
}
