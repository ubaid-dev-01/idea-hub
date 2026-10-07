'use client';

import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

import { IdeaHubMark } from '@/components/brand/IdeaHubLogo';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

import { useAdminTheme } from './AdminThemeContext';

function roleLabel(role: string | undefined): string {
  if (!role) return '';
  return role
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function AdminTopBar() {
  const user = useAuthStore((s) => s.user);
  const now = new Date();
  const { isLight, toggleTheme } = useAdminTheme();
  const toggleAdminSidebar = useUiStore((s) => s.toggleAdminSidebar);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 w-full min-w-0 border-b border-[var(--lh-line)] bg-[var(--lh-bg)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full min-w-0 max-w-[min(100%,1920px)] items-center gap-2 px-3 md:gap-4 md:px-5">
        <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2 md:min-w-[180px] lg:min-w-[220px]">
          <button
            type="button"
            onClick={toggleAdminSidebar}
            className="shrink-0 rounded-lg p-2 text-[var(--lh-ink)] transition hover:bg-[var(--lh-surface)] md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-2"
          >
            <IdeaHubMark size={28} inverted={!isLight} />
            <span className="landing-display min-w-0 truncate text-sm font-semibold tracking-tight text-[var(--lh-ink)] sm:text-base md:text-lg">
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Idea Hub Admin</span>
            </span>
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
          <div className="relative w-full max-w-2xl lg:max-w-3xl xl:max-w-4xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lh-muted)]" />
            <input
              type="search"
              placeholder="Search projects, ideas, users, reports…"
              className="h-10 w-full rounded-full border border-[var(--lh-line)] bg-[var(--lh-surface)] py-2 pl-10 pr-4 text-sm text-[var(--lh-ink)] placeholder:text-[var(--lh-muted)] focus:border-[var(--lh-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--lh-accent-soft)]"
              readOnly
              aria-readonly
            />
          </div>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-2.5">
          <span className="hidden text-[10px] tabular-nums text-[var(--lh-muted)] lg:block">
            {format(now, 'MMM d, yyyy | h:mm a')}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full p-1.5 text-[var(--lh-muted)] transition hover:bg-[var(--lh-surface)] hover:text-[var(--lh-ink)]"
            aria-label={isLight ? 'Dark mode' : 'Light mode'}
          >
            {isLight ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="relative rounded-full p-1.5 text-[var(--lh-muted)] transition hover:bg-[var(--lh-surface)] hover:text-[var(--lh-ink)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--lh-accent)]" />
          </button>
          <div className="hidden h-6 w-px bg-[var(--lh-line)] sm:block" />
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="max-w-[4.5rem] truncate text-xs font-medium text-[var(--lh-ink)] sm:max-w-[8rem] lg:max-w-[12rem]"
              title={user?.fullName ?? 'Admin'}
            >
              {user?.fullName ?? 'Admin'}
            </span>
            <span className="hidden shrink-0 rounded-full border border-[var(--lh-line)] bg-[var(--lh-accent-soft)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--lh-accent)] sm:inline-flex">
              {roleLabel(user?.role)}
            </span>
          </div>
          <Link
            href="/"
            className="hidden text-xs text-[var(--lh-muted)] transition hover:text-[var(--lh-accent)] md:inline"
          >
            Main site
          </Link>
        </div>
      </div>
    </header>
  );
}
