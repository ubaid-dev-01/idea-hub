'use client';

import Image from 'next/image';
import Link from 'next/link';
import { isAfter, subDays, subHours } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsInfinite,
} from '@/hooks/useNotifications';
import { ideasApi } from '@/lib/api/ideas.api';
import { formatRelative } from '@/lib/utils';
import type { IIdea, INotification } from '@/types/api';

function bucket(iso: string): 'new' | 'week' | 'month' {
  const d = new Date(iso);
  if (isAfter(d, subHours(new Date(), 24))) return 'new';
  if (isAfter(d, subDays(new Date(), 7))) return 'week';
  return 'month';
}

function notificationCopy(n: INotification): string {
  const name =
    n.senderId && typeof n.senderId === 'object'
      ? (n.senderId as { fullName?: string }).fullName ?? 'Someone'
      : 'Someone';
  const title = n.title || 'Update';
  switch (n.type) {
    case 'like':
      return `${name} liked your idea “${title}”`;
    case 'comment':
      return `${name} commented: “${(n.body ?? '').slice(0, 80)}…”`;
    case 'collab_request':
      return `${name} wants to collaborate on “${title}”`;
    case 'collab_accepted':
      return `${name} accepted your collaboration request`;
    case 'new_idea_from_followed':
      return `${name} posted a new idea: “${title}”`;
    case 'idea_trending':
      return `Your idea “${title}” is trending!`;
    case 'mention':
      return `${name} mentioned you in a comment`;
    default:
      return n.body || title;
  }
}

function refPath(n: INotification): string {
  switch (n.referenceType) {
    case 'idea':
    case 'comment':
    case 'collab_request':
      return `/ideas/${n.referenceId}`;
    case 'user':
      if (n.type === 'ai_coach_daily_brief') return '/feed';
      return `/profile/${n.referenceId}`;
    case 'live_room':
      return `/live/${n.referenceId}`;
    case 'marketplace_listing':
      return `/marketplace/${n.referenceId}`;
    default:
      return '/notifications';
  }
}

function NotifThumb({ ideaId }: { ideaId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void ideasApi
      .getById(ideaId)
      .then((idea: IIdea) => {
        if (cancelled) return;
        const m = idea.media?.[0];
        const u = m?.thumbnailUrl || m?.cdnUrl || m?.firebaseUrl;
        setSrc(u ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ideaId]);
  if (!src) {
    return (
      <div className="h-14 w-14 shrink-0 rounded-lg bg-surface2 dark:bg-[#242526]" />
    );
  }
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface2">
      <Image src={src} alt="" fill className="object-cover" unoptimized />
    </div>
  );
}

function NotifRow({
  n,
  onRead,
}: {
  n: INotification;
  onRead: (id: string) => void;
}) {
  const href = refPath(n);
  const sender = n.senderId;
  const showThumb =
    n.referenceType === 'idea' || n.referenceType === 'collab_request';

  return (
    <Link
      href={href}
      onClick={() => {
        if (!n.isRead) onRead(n._id);
      }}
      className={cn(
        'flex gap-3 border-b border-[var(--border)] px-3 py-3 transition-colors hover:bg-surface2/80 dark:border-slate-700/50 dark:hover:bg-[#242526]/80',
        !n.isRead && 'bg-brand/[0.06] dark:bg-indigo-500/10'
      )}
    >
      {!n.isRead ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand dark:bg-indigo-400" />
      ) : (
        <span className="w-2 shrink-0" />
      )}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface2">
        {sender && typeof sender === 'object' && sender.avatarUrl ? (
          <Image
            src={sender.avatarUrl}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
            <ICONS.notifications size={20} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm text-[var(--text)]',
            !n.isRead && 'font-semibold'
          )}
        >
          {notificationCopy(n)}
        </p>
        <p
          className={cn(
            'mt-1 text-xs',
            !n.isRead
              ? 'font-medium text-brand dark:text-indigo-400'
              : 'text-[var(--text-muted)]'
          )}
        >
          {formatRelative(n.createdAt)}
        </p>
      </div>
      {showThumb ? <NotifThumb ideaId={n.referenceId} /> : null}
    </Link>
  );
}

function NotificationsContent() {
  const q = useNotificationsInfinite();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const list = q.data?.pages.flatMap((p) => p.notifications) ?? [];

  const grouped = useMemo(() => {
    const g = {
      new: [] as INotification[],
      week: [] as INotification[],
      month: [] as INotification[],
    };
    for (const n of list) {
      g[bucket(n.createdAt)].push(n);
    }
    return g;
  }, [list]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--text)]">Notifications</h1>
        <button
          type="button"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || !list.some((n) => !n.isRead)}
          className="text-sm font-semibold text-brand dark:text-indigo-400 disabled:opacity-40"
        >
          Mark all read
        </button>
      </div>
      {q.isLoading ? (
        <p className="text-center text-sm text-[var(--text-muted)]">Loading…</p>
      ) : !list.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-16 text-center dark:border-slate-700/50">
          <p className="text-sm text-[var(--text-muted)]">
            You&apos;re all caught up.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] dark:border-slate-700/50 dark:bg-[#18191a]">
          {grouped.new.length ? (
            <section>
              <p className="bg-surface2 px-3 py-2 text-xs font-bold uppercase text-[var(--text-muted)] dark:bg-[#242526]">
                New
              </p>
              {grouped.new.map((n) => (
                <NotifRow
                  key={n._id}
                  n={n}
                  onRead={(id) => markRead.mutate(id)}
                />
              ))}
            </section>
          ) : null}
          {grouped.week.length ? (
            <section>
              <p className="bg-surface2 px-3 py-2 text-xs font-bold uppercase text-[var(--text-muted)] dark:bg-[#242526]">
                Earlier this week
              </p>
              {grouped.week.map((n) => (
                <NotifRow
                  key={n._id}
                  n={n}
                  onRead={(id) => markRead.mutate(id)}
                />
              ))}
            </section>
          ) : null}
          {grouped.month.length ? (
            <section>
              <p className="bg-surface2 px-3 py-2 text-xs font-bold uppercase text-[var(--text-muted)] dark:bg-[#242526]">
                This month
              </p>
              {grouped.month.map((n) => (
                <NotifRow
                  key={n._id}
                  n={n}
                  onRead={(id) => markRead.mutate(id)}
                />
              ))}
            </section>
          ) : null}
        </div>
      )}
      {q.hasNextPage ? (
        <button
          type="button"
          className="mt-4 w-full py-2 text-sm font-semibold text-brand"
          onClick={() => void q.fetchNextPage()}
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}
