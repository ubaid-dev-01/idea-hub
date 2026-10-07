'use client';

import {
  BarChart3,
  Bell,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { IdeaHubMark } from '@/components/brand/IdeaHubLogo';
import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { cn } from '@/components/ui/cn';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

const items: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: 'exact' | 'prefix';
}> = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, match: 'exact' },
  { href: '/admin/users', label: 'Users', icon: Users, match: 'prefix' },
  { href: '/admin/ideas', label: 'Ideas', icon: Lightbulb, match: 'prefix' },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare, match: 'prefix' },
  { href: '/admin/scan-queue', label: 'Review Queue', icon: ShieldCheck, match: 'prefix' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, match: 'prefix' },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, match: 'prefix' },
  { href: '/admin/notifications', label: 'Broadcasts', icon: Bell, match: 'prefix' },
  { href: '/admin/settings', label: 'Settings', icon: Settings, match: 'prefix' },
];

const TOP_OFFSET = 'top-[calc(3.5rem+env(safe-area-inset-top))]';
const SIDEBAR_W = 'w-[min(18rem,100vw)] md:w-72';

export function AdminSidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuth();
  const { isLight } = useAdminTheme();
  const adminOpen = useUiStore((s) => s.adminSidebarOpen);
  const setAdminOpen = useUiStore((s) => s.setAdminSidebarOpen);

  return (
    <>
      {adminOpen ? (
        <button
          type="button"
          className={cn(
            'fixed inset-0 z-30 bg-[var(--lh-ink)]/40 backdrop-blur-sm md:hidden',
            TOP_OFFSET
          )}
          aria-label="Close menu"
          onClick={() => setAdminOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'fixed left-0 z-40 flex max-w-[100vw] flex-col overflow-hidden border-r border-[var(--lh-line)] bg-[var(--lh-bg)] transition-transform duration-200 ease-out',
          SIDEBAR_W,
          TOP_OFFSET,
          'h-[calc(100dvh-3.5rem-env(safe-area-inset-top))]',
          adminOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--lh-line)] px-4 py-3">
          <IdeaHubMark size={40} inverted={!isLight} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-wide text-[var(--lh-ink)]">
              {user?.fullName ?? 'Admin'}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--lh-muted)]">
              Console · {user?.role === 'super_admin' ? 'Super Admin' : 'Moderator'}
            </p>
          </div>
        </div>

        <div className="mx-3 my-2 h-px bg-[var(--lh-line)]" />

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-2 pt-1">
          {items.map(({ href, label, icon: Icon, match }) => {
            const isActive =
              match === 'exact'
                ? pathname === href || pathname === `${href}/`
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setAdminOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-sm transition',
                  isActive
                    ? 'bg-[var(--lh-accent-soft)] font-semibold text-[var(--lh-accent)]'
                    : 'text-[var(--lh-muted)] hover:bg-[var(--lh-surface)] hover:text-[var(--lh-ink)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-[var(--lh-line)] bg-[var(--lh-surface)] px-3 py-3">
          <div className="mb-3 flex items-center gap-3 border border-[var(--lh-line)] bg-[var(--lh-bg)] p-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[var(--lh-line)] bg-[var(--lh-surface)]">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[var(--lh-accent)]">
                  {(user?.fullName ?? '?').slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--lh-ink)]">
                {user?.fullName ?? 'Admin'}
              </p>
              <p className="truncate text-xs text-[var(--lh-muted)]">
                @{user?.username ?? 'admin'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--lh-line)] bg-[var(--lh-bg)] px-4 py-2.5 text-sm font-medium text-[var(--lh-ink)] transition hover:border-red-300 hover:text-red-700 dark:hover:border-red-800 dark:hover:text-red-300"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Log out
          </button>

          <p className="mt-2 text-center text-[10px] leading-snug text-[var(--lh-muted)]">
            Live API data · staff only
          </p>
        </div>
      </aside>
    </>
  );
}
