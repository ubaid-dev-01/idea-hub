'use client';

import { Bell } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isToday, parseISO } from 'date-fns';

import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationListener,
  useNotifications,
} from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/authStore';
import type { INotification } from '@/types/api';

function groupBySection(items: INotification[]) {
  const today: INotification[] = [];
  const earlier: INotification[] = [];
  for (const n of items) {
    try {
      const d = parseISO(n.createdAt);
      if (isToday(d)) today.push(n);
      else earlier.push(n);
    } catch {
      earlier.push(n);
    }
  }
  return { today, earlier };
}

export function NotificationBell() {
  const authed = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { unreadBump, resetBump } = useNotificationListener();
  const { data, isLoading, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const list = data?.notifications ?? [];
  const unreadServer = list.filter((n) => !n.isRead).length;
  const unread = unreadServer + unreadBump;
  const badge = unread > 9 ? '9+' : unread > 0 ? String(unread) : null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      resetBump();
      void refetch();
    }
  }, [open, refetch, resetBump]);

  if (!authed) return null;

  const { today, earlier } = groupBySection(list);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-btn p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border-light)] hover:text-[var(--color-text-primary)] dark:hover:bg-gray-700"
        aria-label="Notifications"
      >
        <Bell size={20} strokeWidth={1.5} aria-hidden />
        {badge ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl animate-slide-up sm:w-96">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
            <span className="text-sm font-semibold text-[var(--text)]">
              Notifications
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || !list.some((n) => !n.isRead)}
            >
              Mark all read
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : !list.length ? (
              <p className="p-8 text-center text-sm text-[var(--text-muted)]">
                You&apos;re all caught up!
              </p>
            ) : (
              <>
                {today.length ? (
                  <div>
                    <p className="bg-surface2 px-3 py-1 text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Today
                    </p>
                    {today.map((n) => (
                      <NotificationItem
                        key={n._id}
                        n={n}
                        onRead={(id) => markRead.mutate(id)}
                      />
                    ))}
                  </div>
                ) : null}
                {earlier.length ? (
                  <div>
                    <p className="bg-surface2 px-3 py-1 text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Earlier
                    </p>
                    {earlier.map((n) => (
                      <NotificationItem
                        key={n._id}
                        n={n}
                        onRead={(id) => markRead.mutate(id)}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
