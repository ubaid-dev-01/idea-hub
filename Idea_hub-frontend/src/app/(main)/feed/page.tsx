'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { HomeFeed } from '@/components/feed/HomeFeed';
import { useFeed } from '@/hooks/useIdeas';
import { useAuthStore } from '@/store/authStore';

function FeedInner() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const tag = searchParams.get('tag') ?? undefined;
  const q = useFeed(tag ?? null);
  const ideas = q.data?.pages.flatMap((p) => p.ideas) ?? [];

  return (
    <HomeFeed
      ideas={ideas}
      isLoading={q.isLoading}
      isFetchingNextPage={q.isFetchingNextPage}
      hasNextPage={q.hasNextPage ?? false}
      fetchNextPage={() => void q.fetchNextPage()}
      currentUserId={user?._id}
      activeTag={tag}
    />
  );
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl p-8 text-center text-sm text-[var(--text-muted)]">
          Loading feed…
        </div>
      }
    >
      <FeedInner />
    </Suspense>
  );
}
