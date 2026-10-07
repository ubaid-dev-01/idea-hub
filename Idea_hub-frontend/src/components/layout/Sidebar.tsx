'use client';

import {
  BarChart2,
  Bell,
  Home,
  LayoutDashboard,
  Lightbulb,
  Radio,
  Search,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/components/ui/cn';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';

const links = [
  { href: '/', label: 'Feed', icon: Home },
  { href: '/trending', label: 'Trending', icon: TrendingUp },
  { href: '/live', label: 'Live rooms', icon: Radio },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith('/admin');
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'fixed left-0 top-14 z-40 flex h-[calc(100dvh-3.5rem)] w-[13.5rem] max-w-[100vw] flex-col overflow-x-hidden border-r transition-transform duration-200 ease-out',
          'border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md',
          'dark:border-cyan-500/15 dark:bg-[#0b111b]/92 dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 border-b px-2.5 py-2.5',
            'border-[var(--border)] dark:border-cyan-500/10'
          )}
        >
          <div
            className={cn(
              'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
              'border-amber-300/50 bg-gradient-to-br from-amber-50 to-yellow-50',
              'dark:border-amber-400/40 dark:from-amber-500/15 dark:to-transparent dark:shadow-[0_0_16px_rgba(251,191,36,0.25)]'
            )}
          >
            <Lightbulb
              className="relative z-[1] h-4 w-4 text-amber-600 dark:text-amber-200"
              strokeWidth={2}
              fill="rgba(251,191,36,0.2)"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-cyan-400/15 to-transparent blur-md dark:from-cyan-400/20"
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold tracking-wide text-[var(--text)]">
              IDEAS HUB
            </p>
            <p className="text-[9px] font-medium uppercase tracking-wider text-[var(--text-muted)] dark:text-cyan-400/55">
              Discover
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-2 [scrollbar-width:thin]">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/'
                ? pathname === '/' || pathname === ''
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition',
                  active
                    ? 'bg-brand/12 text-brand shadow-sm dark:border dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-[#00f2ff] dark:shadow-[0_0_16px_rgba(0,242,255,0.08)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] dark:hover:border dark:border-transparent dark:hover:bg-cyan-500/5 dark:hover:text-slate-200'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" />
                {label}
              </Link>
            );
          })}
          {user ? (
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'mt-2 flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition',
                pathname === '/dashboard' || pathname.startsWith('/dashboard/')
                  ? 'bg-brand/12 text-brand shadow-sm dark:border dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-[#00f2ff]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] dark:hover:bg-cyan-500/5 dark:hover:text-slate-200'
              )}
            >
              <BarChart2 className="h-3.5 w-3.5 shrink-0 opacity-90" />
              My dashboard
            </Link>
          ) : null}
          {user?.role === 'super_admin' || user?.role === 'moderator' ? (
            <Link
              href="/admin/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'mt-3 flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition',
                isAdminPath(pathname)
                  ? 'bg-brand/12 text-brand dark:border dark:border-cyan-400/25 dark:bg-cyan-400/10 dark:text-[#00f2ff] dark:shadow-[0_0_16px_rgba(0,242,255,0.08)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--surface2)] hover:text-[var(--text)] dark:hover:bg-cyan-500/5 dark:hover:text-slate-200'
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0 opacity-90" />
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="mt-auto border-t border-[var(--border)] p-2 dark:border-cyan-500/10">
          <div
            className={cn(
              'rounded-lg border border-dashed p-2.5 text-[9px] leading-snug text-[var(--text-muted)]',
              'dark:border-cyan-500/20 dark:bg-cyan-500/[0.04] dark:text-cyan-200/45'
            )}
          >
            Share ideas, find collaborators, and grow your network.
          </div>
        </div>
      </aside>
    </>
  );
}
