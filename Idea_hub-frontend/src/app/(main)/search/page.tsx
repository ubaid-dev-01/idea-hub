'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

import { IdeaPostCard } from '@/components/feed/IdeaPostCard';
import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import { useSearchIdeas, useTrendingIdeas } from '@/hooks/useIdeas';
import { useIsDesktopModal } from '@/hooks/useMediaQuery';
import { pushWithViewTransition } from '@/lib/viewTransitions';
import { useAuthStore } from '@/store/authStore';
import type { IdeaCategory, IUser } from '@/types/api';

const CATS: Array<IdeaCategory | 'all'> = [
  'all',
  'tech',
  'health',
  'education',
  'finance',
  'art',
  'social',
  'other',
];

function firstThumb(idea: { media: Array<{ thumbnailUrl?: string; cdnUrl?: string; firebaseUrl?: string; mediaType: string }> }) {
  for (const m of idea.media ?? []) {
    if (m.mediaType === 'image' || m.mediaType === 'video') {
      return m.thumbnailUrl || m.cdnUrl || m.firebaseUrl || null;
    }
  }
  return null;
}

function SearchPageContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const tagFromUrl = sp.get('tag') ?? '';
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [cat, setCat] = useState<IdeaCategory | 'all'>('all');
  const [tab, setTab] = useState<'ideas' | 'people' | 'tags'>('ideas');
  const user = useAuthStore((s) => s.user);
  const isDesktop = useIsDesktopModal();

  const searchParams = useMemo(
    () => ({
      q: submitted || undefined,
      category: cat === 'all' ? undefined : cat,
      tags: tagFromUrl || undefined,
      sortBy: 'trending' as const,
    }),
    [submitted, cat, tagFromUrl]
  );

  const query = useSearchIdeas(searchParams);
  const trendingQ = useTrendingIdeas();
  const ideas = query.data?.pages.flatMap((p) => p.ideas) ?? [];
  const explore = trendingQ.data ?? [];

  const peopleResults = useMemo(() => {
    const m = new Map<string, IUser>();
    for (const idea of ideas) {
      const a = idea.authorId;
      if (a && typeof a === 'object' && '_id' in a) {
        const u = a as IUser;
        if (
          submitted &&
          (u.username.toLowerCase().includes(submitted.toLowerCase()) ||
            u.fullName.toLowerCase().includes(submitted.toLowerCase()))
        ) {
          m.set(u._id, u);
        }
      }
    }
    return [...m.values()].slice(0, 20);
  }, [ideas, submitted]);

  const tagHits = useMemo(() => {
    if (!submitted) return [];
    const m = new Map<string, number>();
    const rx = new RegExp(submitted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    for (const idea of ideas) {
      for (const t of idea.tags) {
        if (rx.test(t)) m.set(t, (m.get(t) ?? 0) + 1);
      }
    }
    return [...m.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .slice(0, 15);
  }, [ideas, submitted]);

  const showExplore = !submitted && !tagFromUrl;

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 border-b border-[var(--border)] bg-[var(--bg)]/95 px-1 pb-3 pt-1 backdrop-blur dark:border-slate-700/50">
        <div className="relative">
          <ICONS.search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={20}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ideas, people, tags…"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-10 text-sm dark:border-slate-700/50 dark:bg-[#18191a]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSubmitted(q.trim());
              }
            }}
          />
          {q ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[var(--text-muted)] hover:bg-surface2"
              onClick={() => {
                setQ('');
                setSubmitted('');
              }}
              aria-label="Clear"
            >
              <ICONS.clear size={18} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={cn(
                'shrink-0 whitespace-nowrap border-b-2 px-2 pb-1 text-sm font-semibold capitalize',
                cat === c
                  ? 'border-brand text-brand dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-[var(--text-muted)]'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {submitted || tagFromUrl ? (
        <div className="flex gap-4 border-b border-[var(--border)] text-sm font-semibold dark:border-slate-700/50">
          {(['ideas', 'people', 'tags'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                'pb-2 capitalize',
                tab === t
                  ? 'border-b-2 border-brand text-brand dark:border-indigo-400'
                  : 'text-[var(--text-muted)]'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      {showExplore ? (
        <div>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Explore
          </h2>
          <div className="columns-2 gap-1 md:columns-3">
            {explore.map((idea) => {
              const src = firstThumb(idea);
              return (
                <Link
                  key={idea._id}
                  href={`/ideas/${idea._id}`}
                  scroll={false}
                  onClick={(e) => {
                    if (!isDesktop) {
                      e.preventDefault();
                      pushWithViewTransition(router, `/ideas/${idea._id}`);
                    }
                  }}
                  className="group relative mb-1 block break-inside-avoid"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-surface2 dark:bg-[#242526]">
                    {src ? (
                      <Image
                        src={src}
                        alt=""
                        fill
                        className="object-cover transition duration-300 group-hover:scale-105"
                        sizes="(max-width:768px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <p className="line-clamp-2 text-xs font-semibold text-white">
                        {idea.title}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {submitted || tagFromUrl ? (
        <>
          {tab === 'ideas' ? (
            <div className="space-y-4">
              {query.isLoading ? (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  Searching…
                </p>
              ) : !ideas.length ? (
                <p className="text-center text-sm text-[var(--text-muted)]">
                  No ideas found.
                </p>
              ) : (
                ideas.map((idea) => (
                  <IdeaPostCard
                    key={idea._id}
                    idea={idea}
                    currentUserId={user?._id}
                  />
                ))
              )}
            </div>
          ) : null}
          {tab === 'people' ? (
            <ul className="space-y-2">
              {!peopleResults.length ? (
                <li className="text-center text-sm text-[var(--text-muted)]">
                  No people match.
                </li>
              ) : (
                peopleResults.map((u) => (
                  <li
                    key={u._id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] p-3 dark:border-slate-700/50"
                  >
                    <Link
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-3"
                    >
                      <div className="relative h-12 w-12 overflow-hidden rounded-full bg-surface2">
                        {u.avatarUrl ? (
                          <Image
                            src={u.avatarUrl}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-semibold">{u.fullName}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          @{u.username}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {(u.skills ?? []).slice(0, 3).join(' · ')}
                        </p>
                      </div>
                    </Link>
                    <button
                      type="button"
                      className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
                    >
                      Follow
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
          {tab === 'tags' ? (
            <ul className="space-y-2">
              {!tagHits.length ? (
                <li className="text-center text-sm text-[var(--text-muted)]">
                  No tags match.
                </li>
              ) : (
                tagHits.map(({ tag, count }) => (
                  <li
                    key={tag}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 dark:border-slate-700/50"
                  >
                    <span className="font-semibold text-brand">#{tag}</span>
                    <span className="text-sm text-[var(--text-muted)]">
                      {count} ideas
                    </span>
                    <Link
                      href={`/search?tag=${encodeURIComponent(tag)}`}
                      className="text-sm font-bold text-brand"
                    >
                      Browse
                    </Link>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">
          Loading search…
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
