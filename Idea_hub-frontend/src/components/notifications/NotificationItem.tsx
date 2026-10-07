'use client';

import { Bell } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/components/ui/cn';
import { truncate, formatRelative } from '@/lib/utils';
import type { INotification } from '@/types/api';

function refPath(n: INotification): string {
  switch (n.referenceType) {
    case 'idea':
      return `/ideas/${n.referenceId}`;
    case 'comment':
      return `/ideas/${n.referenceId}`;
    case 'user':
      if (n.type === 'ai_coach_daily_brief') return '/feed';
      return `/profile/${n.referenceId}`;
    case 'collab_request':
      return `/ideas/${n.referenceId}`;
    case 'live_room':
      return `/live/${n.referenceId}`;
    case 'marketplace_listing':
      return `/marketplace/${n.referenceId}`;
    default:
      return '/notifications';
  }
}

export function NotificationItem({
  n,
  onRead,
}: {
  n: INotification;
  onRead: (id: string) => void;
}) {
  const href = refPath(n);
  const sender = n.senderId;

  return (
    <Link
      href={href}
      onClick={() => {
        if (!n.isRead) onRead(n._id);
      }}
      className={cn(
        'flex gap-3 border-b border-[var(--border)] px-3 py-3 transition-colors hover:bg-surface2',
        !n.isRead && 'bg-brand/5'
      )}
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface2">
        {sender?.avatarUrl ? (
          <Image
            src={sender.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
            <Bell className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--text)]">{n.title}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {truncate(n.body, 60)}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {formatRelative(n.createdAt)}
        </p>
      </div>
      {!n.isRead ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" />
      ) : null}
    </Link>
  );
}
