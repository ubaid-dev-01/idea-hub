'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/components/ui/cn';
import { useLeaderboard } from '@/hooks/useGamification';
import { isGamificationUiEnabled } from '@/lib/gamification';
import { useAuthStore } from '@/store/authStore';

const CATEGORIES = [
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
] as const;

export default function LeaderboardPage() {
  const authed = useAuthStore((s) => Boolean(s.accessToken));
  const [scope, setScope] = useState<'global' | 'following' | 'category'>(
    'global'
  );
  const [category, setCategory] = useState<string>('tech');
  const [followingCat, setFollowingCat] = useState<string>('');

  const categoryParam =
    scope === 'category'
      ? category
      : scope === 'following' && followingCat
        ? followingCat
        : undefined;

  const q = useLeaderboard(scope, categoryParam);

  if (!isGamificationUiEnabled()) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)] dark:border-gray-700">
        Leaderboard is not enabled. Set{' '}
        <code className="rounded bg-[var(--color-border-light)] px-1">
          NEXT_PUBLIC_ENABLE_GAMIFICATION=true
        </code>{' '}
        to show weekly XP rankings.
      </div>
    );
  }

  const rows = q.data?.rows ?? [];
  const myRow = q.data?.myRow;
  const myRank = q.data?.myRank ?? null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Weekly leaderboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Top creators by XP earned this week (resets Monday 00:00 UTC).
          {q.data?.weekBucket ? ` Week of ${q.data.weekBucket}.` : ''}
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['global', 'Global'],
              ['following', 'Following'],
              ['category', 'By category'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setScope(key)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                scope === key
                  ? 'bg-brand text-white'
                  : 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)] hover:bg-brand/10 dark:bg-gray-800'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {scope === 'category' ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input h-9 rounded-lg text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {scope === 'following' && authed ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[var(--color-text-muted)]">Filter</span>
            <select
              value={followingCat}
              onChange={(e) => setFollowingCat(e.target.value)}
              className="input h-9 rounded-lg text-sm"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {scope === 'following' && !authed ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Log in to see people you follow on the leaderboard.
        </p>
      ) : null}

      {q.isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {q.error instanceof Error ? q.error.message : 'Failed to load'}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          No entries for this view yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.userId}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 dark:border-gray-700"
            >
              <span className="w-8 text-center text-lg font-bold text-[var(--color-text-muted)]">
                {r.rank}
              </span>
              <Link
                href={`/profile/${r.username}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar
                  src={r.avatarUrl}
                  fallback={r.fullName || r.username}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">
                    {r.fullName || r.username}
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    @{r.username} · Lv {r.level} {r.levelTitle}
                  </p>
                </div>
              </Link>
              <span className="shrink-0 text-sm font-bold text-brand dark:text-indigo-400">
                {r.weeklyXpEarned} XP
              </span>
            </li>
          ))}
        </ol>
      )}

      {authed &&
      myRow != null &&
      myRank != null &&
      !rows.some((r) => r.userId === myRow.userId) ? (
        <section className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4 dark:border-indigo-500/30 dark:bg-indigo-950/20">
          <p className="text-xs font-bold uppercase tracking-wide text-brand dark:text-indigo-400">
            Your rank
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="w-8 text-center text-lg font-bold">
              {myRow.rank}
            </span>
            <Avatar
              src={myRow.avatarUrl}
              fallback={myRow.fullName || myRow.username}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{myRow.fullName || myRow.username}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                @{myRow.username} · {myRow.weeklyXpEarned} XP this week
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
