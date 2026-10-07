'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Flame, LogOut, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ideasApi } from '@/lib/api/ideas.api';
import { usersApi } from '@/lib/api/users.api';
import type { IUser } from '@/types/api';

import { AICoachWidget } from '@/components/coach/AICoachWidget';
import { IdeaHubMark } from '@/components/brand/IdeaHubLogo';
import { CreateIdeaModal } from '@/components/feed/CreateIdeaModal';
import { StreakCounter } from '@/components/gamification/StreakCounter';
import { WeeklyChallenge } from '@/components/gamification/WeeklyChallenge';
import { Navbar } from '@/components/layout/Navbar';
import { FirebaseAuthBridge } from '@/components/providers/FirebaseAuthBridge';
import { cn } from '@/components/ui/cn';
import { useMyProgress } from '@/hooks/useGamification';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadDmCount } from '@/hooks/useUnreadDmCount';
import { isAiCoachUiEnabled } from '@/lib/ai-coach-ui';
import { isGamificationUiEnabled } from '@/lib/gamification';
import { ICONS } from '@/lib/icons';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

const nav = [
  { href: '/feed', label: 'Home', icon: ICONS.home },
  { href: '/dashboard', label: 'Dashboard', icon: ICONS.dashboard },
  { href: '/search', label: 'Explore', icon: ICONS.explore },
  { href: '/messages', label: 'Messages', icon: ICONS.messages },
  { href: '/marketplace', label: 'Marketplace', icon: ICONS.marketplace },
  { href: '/my-ideas', label: 'My Ideas', icon: ICONS.myIdeas },
  { href: '/saved', label: 'Saved', icon: ICONS.saved },
  {
    href: '/collaborations',
    label: 'Collaborations',
    icon: ICONS.collaborations,
  },
  { href: '/leaderboard', label: 'Leaderboard', icon: ICONS.leaderboard },
  { href: '/notifications', label: 'Notifications', icon: ICONS.notifications },
  {
    href: '/profile',
    label: 'Profile',
    icon: ICONS.profile,
    matchPrefix: '/profile',
  },
  { href: '/pricing', label: 'Pricing', icon: ICONS.pricing },
  { href: '/account/settings', label: 'Settings', icon: ICONS.settings },
] as const;

function RightSidebar() {
  const queryClient = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const trendingQ = useQuery({
    queryKey: ['ideas', 'trending'],
    queryFn: () => ideasApi.getTrending(),
    staleTime: 60_000,
  });
  const trendingTagsQ = useQuery({
    queryKey: ['ideas', 'trending-tags'],
    queryFn: () => ideasApi.getTrendingTags(),
    staleTime: 5 * 60_000,
  });
  const ideas = trendingQ.data ?? [];

  const myFollowingQ = useQuery({
    queryKey: ['me', 'following'],
    queryFn: () => usersApi.getFollowing(),
    enabled: Boolean(me),
    staleTime: 60_000,
  });

  const initialFollowingSet = useMemo(() => {
    const set = new Set<string>();
    for (const u of myFollowingQ.data?.users ?? []) set.add(u._id);
    return set;
  }, [myFollowingQ.data?.users]);

  const [followOverrides, setFollowOverrides] = useState<Record<string, boolean>>(
    {}
  );

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const idea of ideas) {
      for (const t of idea.tags ?? []) {
        const k = String(t).toLowerCase();
        m.set(k, (m.get(k) ?? 0) + 1);
      }
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [ideas]);

  const trendingTagList =
    trendingTagsQ.data?.tags?.length ?
      trendingTagsQ.data.tags.map((r) => r.tag)
    : tagCounts;

  const suggested = useMemo(() => {
    const seen = new Set<string>();
    const users: Array<{
      _id: string;
      username: string;
      fullName: string;
      avatarUrl: string;
      skills: string[];
    }> = [];
    for (const idea of ideas) {
      const a = idea.authorId;
      if (a && typeof a === 'object' && '_id' in a) {
        const u = a as IUser;
        if (!seen.has(u._id) && u._id !== me?._id) {
          seen.add(u._id);
          users.push({
            _id: u._id,
            username: u.username,
            fullName: u.fullName,
            avatarUrl: u.avatarUrl,
            skills: u.skills ?? [],
          });
        }
      }
      if (users.length >= 5) break;
    }
    return users;
  }, [ideas, me?._id]);

  const followMut = useMutation({
    mutationFn: async ({
      userId,
      next,
    }: {
      userId: string;
      next: boolean;
    }) => {
      if (next) await usersApi.follow(userId);
      else await usersApi.unfollow(userId);
    },
    onMutate: async ({ userId, next }) => {
      setFollowOverrides((m) => ({ ...m, [userId]: next }));
    },
    onError: (_err, { userId }) => {
      setFollowOverrides((m) => {
        const copy = { ...m };
        delete copy[userId];
        return copy;
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'following'] });
    },
  });

  const top5 = ideas.slice(0, 5);

  return (
    <aside className="hidden w-[320px] shrink-0 xl:block">
      <div className="fixed top-[calc(4rem+0.75rem)] h-[calc(100dvh-4rem-1.5rem)] w-[300px] overflow-y-auto pr-2">
        <section className="border-b border-[var(--lh-line)] pb-5">
          <h3 className="landing-display text-sm font-semibold text-[var(--lh-ink)]">
            Suggested collaborators
          </h3>
          <ul className="mt-3 space-y-3">
            {suggested.length ? (
              suggested.map((u) => (
                <li
                  key={u._id}
                  className="flex items-center gap-3 rounded-xl border border-transparent p-1 hover:bg-surface2 dark:hover:bg-[#242526]"
                >
                  <Link
                    href={`/profile/${u.username}`}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <div
                      className="h-10 w-10 shrink-0 rounded-full bg-surface2 bg-cover bg-center"
                      style={
                        u.avatarUrl
                          ? { backgroundImage: `url(${u.avatarUrl})` }
                          : undefined
                      }
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">
                        {u.fullName}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {(u.skills ?? []).slice(0, 2).join(' · ') || 'Creator'}
                      </p>
                    </div>
                  </Link>
                  {me ? (
                    (() => {
                      const isFollowing =
                        followOverrides[u._id] ?? initialFollowingSet.has(u._id);
                      return (
                        <button
                          type="button"
                          disabled={followMut.isPending}
                          onClick={() =>
                            followMut.mutate({ userId: u._id, next: !isFollowing })
                          }
                          className={cn(
                            'shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                            isFollowing
                              ? 'rounded-full border border-[var(--lh-line)] bg-transparent text-[var(--lh-ink)] hover:bg-[var(--lh-surface)]'
                              : 'rounded-full bg-[var(--lh-ink)] text-[var(--lh-bg)] hover:opacity-90',
                            followMut.isPending && 'opacity-70'
                          )}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      );
                    })()
                  ) : (
                    <Link
                      href="/login"
                      className="shrink-0 rounded-full bg-[var(--lh-ink)] px-3 py-1.5 text-xs font-semibold text-[var(--lh-bg)] hover:opacity-90"
                    >
                      Follow
                    </Link>
                  )}
                </li>
              ))
            ) : (
              <li className="text-sm text-[var(--text-muted)]">
                No suggestions yet.
              </li>
            )}
          </ul>
        </section>

        <section className="mt-6 border-b border-[var(--lh-line)] pb-5">
          <h3 className="landing-display text-sm font-semibold text-[var(--lh-ink)]">
            Trending ideas
          </h3>
          <ol className="mt-3 space-y-2">
            {top5.length ? (
              top5.map((idea, i) => (
                <li key={idea._id}>
                  <Link
                    href={`/ideas/${idea._id}`}
                    className="flex gap-2 text-sm hover:text-[var(--lh-accent)]"
                  >
                    <span className="font-bold text-[var(--text-muted)]">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-[var(--text)]">
                      {idea.title}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">
                      {idea.likeCount} ♥
                    </span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-sm text-[var(--text-muted)]">Nothing yet.</li>
            )}
          </ol>
        </section>

        <section className="mt-6 pb-2">
          <h3 className="landing-display text-sm font-semibold text-[var(--lh-ink)]">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-[var(--lh-accent)]" aria-hidden />
              Trending tags
            </span>
          </h3>
          <p className="mt-1 text-[10px] text-[var(--lh-muted)]">
            Refreshed every ~15 min from real activity
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {trendingTagList.length ? (
              trendingTagList.map((tag) => (
                <Link
                  key={tag}
                  href={`/feed?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-[var(--lh-line)] px-3 py-1 text-xs font-medium text-[var(--lh-ink)] hover:bg-[var(--lh-surface)]"
                >
                  #{tag}
                </Link>
              ))
            ) : (
              <span className="text-sm text-[var(--lh-muted)]">—</span>
            )}
          </div>
        </section>

        <footer className="mt-6 flex flex-wrap justify-center gap-2 text-[10px] text-[var(--lh-muted)]">
          <Link href="/pricing" className="hover:underline">
            Pricing
          </Link>
          <span>·</span>
          <Link href="/about" className="hover:underline">
            About
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
        </footer>
      </div>
    </aside>
  );
}

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [profileExtrasOpen, setProfileExtrasOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const progressQ = useMyProgress();
  const openCreate = useUiStore((s) => s.openCreateIdea);
  const createOpen = useUiStore((s) => s.createIdeaOpen);
  const closeCreate = useUiStore((s) => s.closeCreateIdea);
  const mediaFocus = useUiStore((s) => s.createIdeaMediaFocus);
  const { setTheme, resolvedTheme } = useTheme();
  const { data: notifData } = useNotifications();
  const unread =
    notifData?.notifications?.filter((n) => !n.isRead).length ?? 0;
  const dmUnread = useUnreadDmCount();

  const profileHref = user
    ? `/profile/${user.username}`
    : '/profile/me';

  const showGamifyCards =
    Boolean(user) &&
    isGamificationUiEnabled() &&
    Boolean(progressQ.data);

  useEffect(() => setMounted(true), []);

  function handleLogout() {
    logout();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <FirebaseAuthBridge />
      <div className="flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden">
        {/* Left — full */}
        <aside className="fixed left-0 top-0 z-30 hidden w-[280px] flex-col border-r border-[var(--lh-line)] bg-[var(--lh-bg)] pt-2 xl:top-16 xl:flex xl:h-[calc(100dvh-4rem)]">
          <div className="shrink-0">
            <div className="px-2 pb-1">
              <div className="flex items-center gap-1 px-3 py-2">
                <Link
                  href={profileHref}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 pl-0 pr-1 transition hover:bg-[var(--lh-surface)]"
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-full bg-[var(--lh-surface)] bg-cover bg-center ring-1 ring-[var(--lh-line)]"
                    style={
                      user?.avatarUrl
                        ? { backgroundImage: `url(${user.avatarUrl})` }
                        : undefined
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--lh-ink)]">
                      {user?.fullName ?? 'Guest'}
                    </p>
                    <p className="truncate text-xs text-[var(--lh-muted)]">
                      @{user?.username ?? 'guest'}
                    </p>
                  </div>
                </Link>
                {showGamifyCards ? (
                  <button
                    type="button"
                    onClick={() => setProfileExtrasOpen((o) => !o)}
                    className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-surface2 dark:hover:bg-[#242526]"
                    aria-expanded={profileExtrasOpen}
                    aria-label={
                      profileExtrasOpen
                        ? 'Hide streak and weekly challenge'
                        : 'Show streak and weekly challenge'
                    }
                  >
                    <ChevronDown
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        profileExtrasOpen && 'rotate-180'
                      )}
                    />
                  </button>
                ) : null}
              </div>
              {showGamifyCards && profileExtrasOpen ? (
                <div className="mt-2 space-y-2 border-t border-[var(--border)] pt-3 dark:border-slate-700/50">
                  <StreakCounter progress={progressQ.data!} />
                  <WeeklyChallenge
                    challenge={progressQ.data!.weeklyChallenge}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 [scrollbar-width:thin]">
            <div className="flex flex-col gap-0.5 pb-2">
              {nav.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === '/profile'
                    ? pathname.startsWith('/profile')
                    : pathname === item.href ||
                      pathname.startsWith(item.href + '/');
                const href =
                  item.href === '/profile' ? profileHref : item.href;
                const showBadge =
                  item.href === '/notifications' && unread > 0;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition',
                      active
                        ? 'bg-[var(--lh-accent-soft)] text-[var(--lh-accent)]'
                        : 'text-[var(--lh-muted)] hover:bg-[var(--lh-surface)] hover:text-[var(--lh-ink)]'
                    )}
                  >
                    <span className="relative">
                      <Icon size={20} />
                      {showBadge ? (
                        <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white animate-badge-pop">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      ) : null}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() =>
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
              className="mb-2 flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium text-[var(--lh-muted)] transition hover:bg-[var(--lh-surface)] hover:text-[var(--lh-ink)]"
              aria-label="Toggle color theme"
            >
              {mounted ? (
                resolvedTheme === 'dark' ? (
                  <Sun
                    size={20}
                    strokeWidth={1.5}
                    className="text-[var(--lh-accent)]"
                  />
                ) : (
                  <Moon
                    size={20}
                    strokeWidth={1.5}
                    className="text-[var(--lh-ink)]"
                  />
                )
              ) : (
                <span className="h-5 w-5" aria-hidden />
              )}
              {mounted ? (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode') : 'Theme'}
            </button>
          </nav>

          <div className="shrink-0 space-y-2 border-t border-[var(--lh-line)] bg-[var(--lh-bg)] p-3">
            <button
              type="button"
              onClick={() => openCreate('none')}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--lh-ink)] py-3 text-sm font-semibold text-[var(--lh-bg)] transition hover:opacity-90"
            >
              <ICONS.post size={20} />
              Post an Idea
            </button>
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--lh-line)] py-2.5 text-sm font-medium text-[var(--lh-muted)] transition hover:bg-red-500/10 hover:text-red-600"
              >
                <LogOut size={18} strokeWidth={2} />
                Log out
              </button>
            ) : null}
          </div>
        </aside>

        {/* Left — icon only tablet */}
        <aside className="fixed left-0 top-0 z-30 hidden w-[60px] flex-col items-center overflow-y-auto overflow-x-hidden border-r border-[var(--lh-line)] bg-[var(--lh-bg)] py-3 md:top-[60px] md:flex md:h-[calc(100dvh-60px)] xl:hidden">
          <Link href="/feed" className="mb-4 shrink-0" title="Home" aria-label="Idea Hub home">
            <IdeaHubMark size={28} />
          </Link>
          <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto">
            {nav.map((item) => {
              const Icon = item.icon;
              const href =
                item.href === '/profile' ? profileHref : item.href;
              const active =
                item.href === '/profile'
                  ? pathname.startsWith('/profile')
                  : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={href}
                  title={item.label}
                  className={cn(
                    'mb-1 shrink-0 rounded-full p-2.5',
                    active
                      ? 'bg-[var(--lh-accent-soft)] text-[var(--lh-accent)]'
                      : 'text-[var(--lh-muted)] hover:bg-[var(--lh-surface)]'
                  )}
                >
                  <Icon size={20} />
                </Link>
              );
            })}
          </div>
          <button
            type="button"
            title="Create"
            onClick={() => openCreate('none')}
            className="mt-2 shrink-0 rounded-full bg-[var(--lh-ink)] p-2.5 text-[var(--lh-bg)]"
          >
            <ICONS.post size={18} />
          </button>
        </aside>

        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:pb-6 md:pl-[60px] md:pt-[60px] xl:pl-[280px] xl:pt-16',
            user
              ? 'pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pt-[60px] md:pb-6'
              : 'pt-0 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pt-[60px] md:pb-6'
          )}
        >
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 gap-6 overflow-hidden px-3 py-3 sm:px-4 sm:py-4 md:px-5">
            <div
              className="feed-scroll-area min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain"
            >
              {children}
            </div>
            <RightSidebar />
          </div>
        </div>
      </div>

      <Navbar />
      <CreateIdeaModal
        open={createOpen}
        onClose={closeCreate}
        initialMediaFocus={mediaFocus}
      />
      {user && isAiCoachUiEnabled() ? <AICoachWidget /> : null}
    </div>
  );
}
