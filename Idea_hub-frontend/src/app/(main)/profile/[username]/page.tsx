'use client';

import { BadgeCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { FollowListModal } from '@/components/profile/FollowListSheet';
import { IdeaPostCard } from '@/components/feed/IdeaPostCard';
import { LevelBadge } from '@/components/gamification/LevelBadge';
import { useMyProgress } from '@/hooks/useGamification';
import { isGamificationUiEnabled } from '@/lib/gamification';
import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useIsDesktopModal } from '@/hooks/useMediaQuery';
import { collectionsApi } from '@/lib/api/collections.api';
import { extractApiError } from '@/lib/api/errors';
import { usersApi } from '@/lib/api/users.api';
import { formatCount } from '@/lib/utils';
import { pushWithViewTransition } from '@/lib/viewTransitions';
import { useAuthStore } from '@/store/authStore';
import type { IIdea } from '@/types/api';

type Tab = 'grid' | 'list' | 'saved' | 'collabs';

function firstThumb(idea: IIdea) {
  for (const m of idea.media ?? []) {
    if (m.mediaType === 'image' || m.mediaType === 'video') {
      return m.thumbnailUrl || m.cdnUrl || m.firebaseUrl;
    }
  }
  return null;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const current = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktopModal();
  const [tab, setTab] = useState<Tab>('grid');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [followSheet, setFollowSheet] = useState<
    'followers' | 'following' | null
  >(null);

  const profileQ = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.getByUsername(username),
    enabled: Boolean(username),
  });

  const collectionsQ = useQuery({
    queryKey: ['collections-by-user', username],
    queryFn: () => collectionsApi.listByUsername(username),
    enabled: Boolean(username),
  });

  const progressQ = useMyProgress();

  const user = profileQ.data;
  const isSelf = Boolean(current && user && current._id === user._id);
  const isFollowing = Boolean(user?.isFollowing);

  const followMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No user');
      if (isFollowing) {
        await usersApi.unfollow(user._id);
      } else {
        await usersApi.follow(user._id);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', username] });
      void queryClient.invalidateQueries({ queryKey: ['user-ideas', user?._id] });
      void queryClient.invalidateQueries({ queryKey: ['followers', username] });
      void queryClient.invalidateQueries({ queryKey: ['following', username] });
      toast.success(isFollowing ? 'Unfollowed' : 'Following');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not update follow'),
  });

  const ideasQ = useInfiniteQuery({
    queryKey: ['user-ideas', user?._id],
    queryFn: ({ pageParam }) =>
      usersApi.getUserIdeas(user!._id, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor,
    enabled: Boolean(user?._id) && tab !== 'saved' && tab !== 'collabs',
  });

  const savedQ = useInfiniteQuery({
    queryKey: ['saved-ideas', 'profile'],
    queryFn: ({ pageParam }) =>
      usersApi.getSavedIdeas(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor,
    enabled: Boolean(isSelf && tab === 'saved'),
  });

  const ideas = ideasQ.data?.pages.flatMap((p) => p.ideas) ?? [];
  const savedIdeas = savedQ.data?.pages.flatMap((p) => p.ideas) ?? [];

  const sentinelRef = useInfiniteScroll(
    () => {
      if (tab === 'saved') {
        if (savedQ.hasNextPage && !savedQ.isFetchingNextPage) {
          void savedQ.fetchNextPage();
        }
        return;
      }
      if (ideasQ.hasNextPage && !ideasQ.isFetchingNextPage) {
        void ideasQ.fetchNextPage();
      }
    },
    {
      enabled:
        tab === 'saved'
          ? Boolean(savedQ.hasNextPage)
          : Boolean(ideasQ.hasNextPage),
    }
  );

  if (profileQ.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        <Skeleton className="mx-auto h-8 w-48" />
      </div>
    );
  }

  if (profileQ.isError || !user) {
    return (
      <div className="rounded-xl border border-red-200 p-8 text-center text-red-700 dark:border-red-900 dark:text-red-300">
        {profileQ.error instanceof Error
          ? profileQ.error.message
          : extractApiError(profileQ.error)}
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'grid', label: 'Grid' },
    { id: 'list', label: 'List' },
    ...(isSelf
      ? [
          { id: 'saved' as const, label: 'Saved' },
          { id: 'collabs' as const, label: 'Collaborations' },
        ]
      : []),
  ];

  return (
    <div className="w-full min-w-0">
      <header className="mb-6 flex flex-col items-center gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-start dark:border-gray-700">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface-elevated)] ring-4 ring-brand/10 dark:border-gray-700 sm:h-28 sm:w-28">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <p className="flex items-center gap-1.5 text-xl font-bold leading-tight text-[var(--color-text-primary)] sm:text-2xl">
              {user.fullName}
              {user.verifiedInnovator ? (
                <BadgeCheck
                  className="h-5 w-5 shrink-0 text-sky-500"
                  aria-label="Verified innovator"
                />
              ) : null}
            </p>
            {isSelf &&
            isGamificationUiEnabled() &&
            progressQ.data ? (
              <LevelBadge
                level={progressQ.data.level}
                levelTitle={progressQ.data.levelTitle}
                emoji={progressQ.data.levelEmoji}
                size="md"
              />
            ) : null}
          </div>
          <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
            @{user.username}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            {isSelf ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditProfileOpen(true)}
              >
                Edit profile
              </Button>
            ) : current ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant={isFollowing ? 'secondary' : 'primary'}
                  loading={followMut.isPending}
                  onClick={() => followMut.mutate()}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button asChild type="button" variant="secondary" size="sm">
                  <Link href={`/messages/${encodeURIComponent(username)}`}>
                    Message
                  </Link>
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    onClick={() => setMoreOpen((v) => !v)}
                    aria-label="More"
                  >
                  <ICONS.more />
                  </Button>
                  {moreOpen ? (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default"
                        aria-label="Close menu"
                        onClick={() => setMoreOpen(false)}
                      />
                      <ul className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl dark:border-slate-700/50 dark:bg-[#242526]">
                        <li>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                            onClick={() => {
                              setMoreOpen(false);
                              void navigator.clipboard.writeText(
                                `${window.location.origin}/profile/${user.username}`
                              );
                            }}
                          >
                            Copy profile link
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                            onClick={() => {
                              setMoreOpen(false);
                              // Placeholder until backend endpoint exists
                              // eslint-disable-next-line no-alert
                              alert('Reported. Our team will review this profile.');
                            }}
                          >
                            Report
                          </button>
                        </li>
                      </ul>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <Button asChild size="sm" variant="primary">
                <Link href="/login">Log in to follow</Link>
              </Button>
            )}
          </div>
          <div className="mt-4 grid w-full max-w-xs grid-cols-3 gap-2 text-center text-sm sm:max-w-none sm:flex sm:flex-wrap sm:justify-start sm:gap-0 sm:text-left">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
              <strong className="text-base text-[var(--color-text-primary)] sm:text-sm">
                {formatCount(user.totalIdeasPosted)}
              </strong>
              <span className="text-xs text-[var(--color-text-muted)] sm:text-sm">
                Ideas
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFollowSheet('followers')}
              className="relative flex flex-col gap-0.5 rounded-lg text-left transition hover:opacity-80 sm:flex-row sm:items-center sm:gap-2 sm:pl-3 sm:before:absolute sm:before:left-0 sm:before:top-1/2 sm:before:h-4 sm:before:w-px sm:before:-translate-y-1/2 sm:before:bg-[var(--color-border)]"
            >
              <strong className="text-base text-[var(--color-text-primary)] sm:text-sm">
                {formatCount(user.followerCount)}
              </strong>
              <span className="text-xs text-[var(--color-text-muted)] sm:text-sm">
                Followers
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFollowSheet('following')}
              className="relative flex flex-col gap-0.5 rounded-lg text-left transition hover:opacity-80 sm:flex-row sm:items-center sm:gap-2 sm:pl-3 sm:before:absolute sm:before:left-0 sm:before:top-1/2 sm:before:h-4 sm:before:w-px sm:before:-translate-y-1/2 sm:before:bg-[var(--color-border)]"
            >
              <strong className="text-base text-[var(--color-text-primary)] sm:text-sm">
                {formatCount(user.followingCount)}
              </strong>
              <span className="text-xs text-[var(--color-text-muted)] sm:text-sm">
                Following
              </span>
            </button>
          </div>
          {user.bio ? (
            <p className="mt-3 max-w-lg text-sm text-[var(--text-muted)]">
              {user.bio}
            </p>
          ) : null}
          {user.skills?.length ? (
            <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
              {user.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      {collectionsQ.data?.length ? (
        <section className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 dark:border-slate-700/50 dark:bg-[#18191a]">
          <p className="text-sm font-bold text-[var(--text)]">Idea collections</p>
          <ul className="mt-3 space-y-2">
            {collectionsQ.data.map((c) => (
              <li key={c._id}>
                <Link
                  href={`/collections/${c._id}`}
                  className="text-sm font-medium text-brand hover:underline"
                >
                  {c.name}
                </Link>
                <span className="ml-2 text-xs text-[var(--text-muted)]">
                  {c.ideaCount} ideas · {c.followerCount} followers
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div
        className={cn(
          'mb-4 grid w-full border-b border-[var(--border)] text-xs font-semibold leading-tight dark:border-slate-700/50 sm:text-sm sm:leading-snug',
          tabs.length === 4 ? 'grid-cols-4' : 'grid-cols-2'
        )}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'relative flex min-h-[3rem] flex-col items-center justify-end px-0.5 pb-2.5 text-center sm:min-h-[3.25rem] sm:pb-3',
              tab === t.id
                ? 'text-[var(--text)] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-9 after:-translate-x-1/2 after:rounded-full after:bg-brand dark:after:bg-indigo-400'
                : 'text-[var(--text-muted)]'
            )}
          >
            <span className="line-clamp-2 w-full break-words px-0.5">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {tab === 'grid' ? (
        ideasQ.isPending ? (
          <p className="text-center text-sm text-[var(--text-muted)]">
            Loading ideas…
          </p>
        ) : ideas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)] dark:border-slate-700/50">
            No public ideas to show yet. Ideas still scanning or private stay off this grid.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {ideas.map((idea) => {
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
                  className="group relative aspect-square overflow-hidden bg-surface2 dark:bg-[#242526]"
                >
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[var(--text-muted)]">
                      {idea.title}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1 text-xs font-bold text-white">
                      <ICONS.like className="text-white" size={16} />{' '}
                      {idea.likeCount}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-white">
                      <ICONS.comment className="text-white" size={16} />{' '}
                      {idea.commentCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : null}

      {tab === 'list' ? (
        ideasQ.isPending ? (
          <p className="text-center text-sm text-[var(--text-muted)]">
            Loading ideas…
          </p>
        ) : ideas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)] dark:border-slate-700/50">
            No ideas in this list.
          </p>
        ) : (
          <div className="space-y-4">
            {ideas.map((idea) => (
              <IdeaPostCard
                key={idea._id}
                idea={idea}
                currentUserId={current?._id}
              />
            ))}
          </div>
        )
      ) : null}

      {tab === 'saved' && isSelf ? (
        savedQ.isPending ? (
          <p className="text-center text-sm text-[var(--text-muted)]">
            Loading saved…
          </p>
        ) : savedIdeas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)] dark:border-slate-700/50">
            No saved ideas yet. Save posts from the feed with the bookmark icon.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {savedIdeas.map((idea) => {
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
                  className="relative aspect-square overflow-hidden bg-surface2"
                >
                  {src ? (
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-1 text-center text-[10px] text-[var(--text-muted)]">
                      {idea.title}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )
      ) : null}

      {tab === 'collabs' && isSelf ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center dark:border-slate-700/50">
          <p className="mx-auto max-w-[16rem] text-balance text-sm leading-snug text-[var(--text-muted)] sm:max-w-xs">
            Collaboration requests and projects — open the hub to manage them.
          </p>
          <div className="mt-5 flex justify-center">
            <Button asChild variant="primary" size="sm">
              <Link href="/collaborations">Go to collaborations</Link>
            </Button>
          </div>
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-8" />

      {isSelf && user ? (
        <EditProfileModal
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          user={user}
          onUpdated={(u) => {
            void queryClient.invalidateQueries({ queryKey: ['profile'] });
            void queryClient.invalidateQueries({
              queryKey: ['user-ideas', u._id],
            });
            if (u.username !== username) {
              router.replace(`/profile/${u.username}`);
            }
          }}
        />
      ) : null}

      {followSheet ? (
        <FollowListModal
          isOpen
          onClose={() => setFollowSheet(null)}
          username={user.username}
          kind={followSheet}
        />
      ) : null}
    </div>
  );
}
