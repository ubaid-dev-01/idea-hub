'use client';

import { ChevronDown, LogOut, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useRef, useState, type FormEvent } from 'react';

import { IdeaHubMark } from '@/components/brand/IdeaHubLogo';
import { MessagesNavLink } from '@/components/messages/MessagesNavLink';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown, type DropdownMenuItem } from '@/components/ui/Dropdown';
import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import { useNotifications } from '@/hooks/useNotifications';
import { XPBar } from '@/components/gamification/XPBar';
import { useAuth } from '@/hooks/useAuth';
import { useMyProgress } from '@/hooks/useGamification';
import { isGamificationUiEnabled } from '@/lib/gamification';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

export function IdeahubLogo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <Link
      href="/feed"
      className="flex min-w-0 items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--lh-ink)]/20"
      aria-label="Idea Hub home"
    >
      <IdeaHubMark size={showWordmark ? 32 : 28} />
      {showWordmark ? (
        <span className="landing-display truncate text-base font-semibold tracking-tight text-[var(--lh-ink)] md:text-lg">
          Idea Hub
        </span>
      ) : null}
    </Link>
  );
}

function MobileNotificationLink({
  unread,
  active,
  compact,
}: {
  unread: number;
  active: boolean;
  /** Top bar: icon-only, no flex-1. */
  compact?: boolean;
}) {
  const badge = unread > 9 ? '9+' : unread > 0 ? String(unread) : null;
  return (
    <Link
      href="/notifications"
      className={cn(
        compact ?
          'relative flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors'
        : 'relative flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[var(--color-text-muted)] transition-colors',
        active && 'text-brand dark:text-brand-400'
      )}
      aria-label="Notifications"
    >
      <span className="relative">
        <ICONS.notifications size={24} strokeWidth={1.5} />
        {badge ? (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const openCreate = useUiStore((s) => s.openCreateIdea);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { logout } = useAuth();
  const { data: notifData } = useNotifications();
  const progressQ = useMyProgress();
  const unread =
    notifData?.notifications?.filter((n) => !n.isRead).length ?? 0;

  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLButtonElement>(null);

  const profileHref = user ? `/profile/${user.username}` : '/profile/me';

  const onSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const t = q.trim();
      if (t) router.push(`/search?q=${encodeURIComponent(t)}`);
      else router.push('/search');
    },
    [q, router]
  );

  const userMenuItems: DropdownMenuItem[] = user
    ? [
        {
          key: 'profile',
          label: 'Your profile',
          icon: <ICONS.profile size={16} strokeWidth={1.5} />,
          href: profileHref,
        },
        {
          key: 'settings',
          label: 'Settings',
          icon: <Settings2 size={16} strokeWidth={1.5} />,
          href: '/account/settings',
        },
        {
          key: 'logout',
          label: 'Log out',
          icon: <LogOut size={16} strokeWidth={1.5} />,
          danger: true,
          onSelect: () => void logout(),
        },
      ]
    : [];

  const homeActive = pathname === '/feed';
  const exploreActive = pathname.startsWith('/search');
  const notifActive = pathname.startsWith('/notifications');
  const profileActive = pathname.startsWith('/profile');

  return (
    <>
      {/* Mobile top — Messages + Notifications (Instagram-style) */}
      {isAuthenticated ? (
        <div
          className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 pb-0 pl-3 pr-2 pt-[max(0px,env(safe-area-inset-top))] backdrop-blur-md md:hidden dark:border-gray-700"
          style={{
            minHeight: 'calc(3rem + env(safe-area-inset-top, 0px))',
          }}
        >
          <IdeahubLogo showWordmark={false} />
          <div className="flex shrink-0 items-center gap-0.5">
            <MessagesNavLink variant="mobile-top" />
            <MobileNotificationLink
              unread={unread}
              active={notifActive}
              compact
            />
          </div>
        </div>
      ) : null}

      {/* Mobile bottom */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-surface)] px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 md:hidden dark:border-gray-700"
        style={{
          minHeight: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
        }}
        aria-label="Primary"
      >
        <Link
          href="/feed"
          className={cn(
            'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[var(--color-text-muted)]',
            homeActive && 'text-brand dark:text-brand-400'
          )}
          aria-label="Home"
        >
          <ICONS.home
            size={24}
            strokeWidth={1.5}
            className={cn(homeActive && 'text-brand')}
          />
        </Link>
        <Link
          href="/search"
          className={cn(
            'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[var(--color-text-muted)]',
            exploreActive && 'text-brand dark:text-brand-400'
          )}
          aria-label="Explore"
        >
          <ICONS.explore
            size={24}
            strokeWidth={1.5}
            className={cn(exploreActive && 'text-brand')}
          />
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!isAuthenticated) {
              router.push('/login');
              return;
            }
            openCreate('none');
          }}
          className="-mt-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--lh-ink)] text-[var(--lh-bg)] ring-4 ring-[var(--color-bg)]"
          aria-label="Create idea"
        >
          <ICONS.post size={28} strokeWidth={1.5} />
        </button>
        {isAuthenticated ? (
          <MobileNotificationLink
            unread={unread}
            active={notifActive}
          />
        ) : (
          <Link
            href="/login"
            className="flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[var(--color-text-muted)]"
            aria-label="Notifications"
          >
            <ICONS.notifications size={24} strokeWidth={1.5} />
          </Link>
        )}
        <Link
          href={isAuthenticated ? profileHref : '/login'}
          className={cn(
            'flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-[var(--color-text-muted)]',
            profileActive && 'text-brand dark:text-brand-400'
          )}
          aria-label="Profile"
        >
          <ICONS.profile
            size={24}
            strokeWidth={1.5}
            className={cn(profileActive && 'text-brand')}
          />
        </Link>
      </nav>

      {/* Tablet + desktop top */}
      <header
        className={cn(
          'fixed left-0 right-0 top-0 z-50 hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-md md:block dark:border-gray-700'
        )}
      >
        <div className="mx-auto flex h-[60px] w-full max-w-[1920px] items-center gap-3 px-3 sm:px-4 xl:h-16 xl:gap-4 xl:px-6">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <IdeahubLogo />
          </div>

          <form
            onSubmit={onSearch}
            className="mx-auto hidden min-w-0 max-w-xs flex-1 md:block xl:max-w-sm"
          >
            <label className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
                <ICONS.search size={18} strokeWidth={1.5} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
                placeholder="Search ideas, people, tags…"
                className="input h-10 w-full py-2 pl-9 pr-3 text-sm"
              />
            </label>
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {isAuthenticated ? (
              <>
                <MessagesNavLink variant="header" />
                <NotificationBell />
                <div className="hidden items-center gap-2 xl:flex">
                  <div className="flex min-w-0 flex-col items-stretch">
                    <Link
                      href={profileHref}
                      className="flex items-center gap-2 rounded-btn p-1 pr-2 transition hover:bg-[var(--color-border-light)] dark:hover:bg-gray-700"
                    >
                      <Avatar
                        src={user?.avatarUrl}
                        fallback={user?.fullName ?? user?.username ?? '?'}
                        size="sm"
                      />
                      <span className="max-w-[8rem] truncate text-sm font-medium text-[var(--color-text-primary)]">
                        {user?.fullName ?? user?.username}
                      </span>
                    </Link>
                    {isGamificationUiEnabled() && progressQ.data ? (
                      <XPBar progress={progressQ.data} />
                    ) : null}
                  </div>
                  <button
                    ref={menuAnchorRef}
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    className="rounded-btn p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border-light)] dark:hover:bg-gray-700"
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <ChevronDown size={20} strokeWidth={1.5} />
                  </button>
                  <Dropdown
                    open={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    anchorRef={menuAnchorRef}
                    items={userMenuItems}
                  />
                </div>
                <Link
                  href={profileHref}
                  className="flex h-10 w-10 items-center justify-center rounded-full xl:hidden"
                  aria-label="Profile"
                >
                  <Avatar
                    src={user?.avatarUrl}
                    fallback={user?.fullName ?? user?.username ?? '?'}
                    size="md"
                  />
                </Link>
              </>
            ) : (
              <Button asChild size="sm" className="whitespace-nowrap">
                <Link href="/login">Log in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
