'use client';

import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';

import { LevelBadge } from '@/components/gamification/LevelBadge';
import { cn } from '@/components/ui/cn';
import { isGamificationUiEnabled } from '@/lib/gamification';
import { formatRelative } from '@/lib/utils';

import { timeAgoShort } from './constants';
import { useIdeaPostCard } from './IdeaPostCardContext';

function IdeaPostHeaderInner() {
  const {
    idea,
    author,
    isOwn,
    following,
    followHover,
    setFollowHover,
    followMut,
    cat,
  } = useIdeaPostCard();

  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <Link
        href={author ? `/profile/${author.username}` : '#'}
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface2 ring-2 ring-transparent hover:ring-brand/30"
      >
        {author?.avatarUrl ? (
          <Image
            src={author.avatarUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={author ? `/profile/${author.username}` : '#'}
            className="text-sm font-semibold text-[var(--color-text-primary)] hover:underline sm:text-base"
          >
            {author?.fullName ?? 'Unknown'}
          </Link>
          {isGamificationUiEnabled() && author?.gamification ? (
            <LevelBadge
              level={author.gamification.level}
              levelTitle={author.gamification.levelTitle}
              emoji={author.gamification.levelEmoji}
            />
          ) : null}
          {author && !isOwn ? (
            <button
              type="button"
              onMouseEnter={() => setFollowHover(true)}
              onMouseLeave={() => setFollowHover(false)}
              onClick={() =>
                void followMut.mutateAsync().catch(() => undefined)
              }
              className={cn(
                'rounded-lg px-3 py-0.5 text-xs font-bold transition',
                following
                  ? cn(
                      'bg-surface2 text-[var(--text)] dark:bg-[#242526]',
                      followHover &&
                        'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                    )
                  : 'bg-brand text-white hover:bg-brand-700 dark:hover:bg-indigo-500'
              )}
            >
              {following
                ? followHover
                  ? 'Unfollow'
                  : 'Following'
                : 'Follow'}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-1 text-xs text-[var(--color-text-muted)]">
          <Link
            href={author ? `/profile/${author.username}` : '#'}
            className="hover:underline"
          >
            @{author?.username ?? 'user'}
          </Link>
          <span>·</span>
          <span title={formatRelative(idea.createdAt)}>
            {timeAgoShort(idea.createdAt)}
          </span>
          <span>·</span>
          <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[11px] font-medium capitalize text-brand dark:text-indigo-300">
            {cat}
          </span>
        </div>
        {idea.tags.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {idea.tags.slice(0, 6).map((t) => (
              <span
                key={t}
                className="text-xs font-medium text-brand dark:text-indigo-300"
              >
                #{t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const IdeaPostHeader = memo(IdeaPostHeaderInner);
