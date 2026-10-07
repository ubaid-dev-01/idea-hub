'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, X } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { usersApi } from '@/lib/api/users.api';
import type { IUser } from '@/types/api';

function FollowListSkeleton() {
  return (
    <div className="px-4 py-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-[var(--color-border)] py-2 last:border-0 dark:border-gray-800"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
            <Skeleton className="h-3.5 w-32 max-w-full" />
            <Skeleton className="h-3 w-24 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FollowRow({ user }: { user: IUser }) {
  return (
    <li className="border-b border-[var(--color-border)] last:border-b-0 dark:border-gray-800">
      <Link
        href={`/profile/${user.username}`}
        className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-black/[0.03] active:bg-black/[0.06] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.07]"
      >
        <Avatar
          src={user.avatarUrl}
          fallback={user.fullName || user.username}
          size="md"
          className="!h-11 !w-11 shrink-0"
        />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold leading-tight text-[var(--color-text-primary)]">
            {user.fullName}
          </p>
          <p className="truncate text-sm font-normal leading-tight text-[var(--text-muted)]">
            @{user.username}
          </p>
        </div>
      </Link>
    </li>
  );
}

export function FollowListBody({
  username,
  kind,
}: {
  username: string;
  kind: 'followers' | 'following';
}) {
  const q = useQuery({
    queryKey: [kind === 'followers' ? 'followers' : 'following', username],
    queryFn: () =>
      kind === 'followers'
        ? usersApi.getFollowersByUsername(username)
        : usersApi.getFollowingByUsername(username),
    enabled: Boolean(username),
  });

  if (q.isLoading) {
    return <FollowListSkeleton />;
  }

  if (q.isError) {
    return (
      <p className="px-4 py-6 text-center text-sm text-red-600">
        {q.error instanceof Error ? q.error.message : 'Failed to load'}
      </p>
    );
  }

  const users = q.data?.users ?? [];

  if (users.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
        {kind === 'followers'
          ? 'No followers yet.'
          : 'Not following anyone yet.'}
      </p>
    );
  }

  return (
    <ul>
      {users.map((u) => (
        <FollowRow key={u._id} user={u} />
      ))}
    </ul>
  );
}

/** Instagram-style centered sheet (profile taps Followers / Following). */
export function FollowListModal({
  isOpen,
  onClose,
  username,
  kind,
}: {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  kind: 'followers' | 'following';
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const title = kind === 'followers' ? 'Followers' : 'Following';

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(92dvh,560px)] w-full max-w-[400px] flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl md:rounded-2xl dark:border-gray-700"
        role="dialog"
        aria-modal
        aria-labelledby="follow-list-title"
      >
        <header className="relative flex h-11 shrink-0 items-center justify-center border-b border-[var(--color-border)] dark:border-gray-700">
          <h2
            id="follow-list-title"
            className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border-light)] dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X className="h-6 w-6" strokeWidth={1.25} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin">
          <FollowListBody username={username} kind={kind} />
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Full-page variant (direct URL / deep link): same list + back to profile. */
export function FollowListPageView({
  username,
  kind,
}: {
  username: string;
  kind: 'followers' | 'following';
}) {
  const title = kind === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="mx-auto min-h-[60vh] w-full max-w-[400px] bg-[var(--color-surface)]">
      <header className="sticky top-0 z-20 flex h-11 items-center border-b border-[var(--color-border)] bg-[var(--color-surface)] dark:border-gray-700">
        <Link
          href={`/profile/${username}`}
          className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-text-primary)] transition hover:bg-[var(--color-border-light)] dark:hover:bg-gray-700"
          aria-label="Back to profile"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={1.25} />
        </Link>
        <h1 className="w-full text-center text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          {title}
        </h1>
      </header>
      <FollowListBody username={username} kind={kind} />
    </div>
  );
}
