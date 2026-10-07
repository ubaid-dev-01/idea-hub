'use client';

import Link from 'next/link';

import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import { useUnreadDmCount } from '@/hooks/useUnreadDmCount';

export function MessagesNavLink({
  variant = 'header',
}: {
  variant?: 'header' | 'mobile-top';
}) {
  const unread = useUnreadDmCount();

  const iconSize = 20;

  return (
    <Link
      href="/messages"
      className={cn(
        'relative flex min-h-11 min-w-11 items-center justify-center rounded-btn p-2 transition',
        variant === 'header' &&
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-border-light)] hover:text-[var(--color-text-primary)] dark:hover:bg-gray-700',
        variant === 'mobile-top' &&
          'text-[var(--color-text-secondary)] hover:bg-[var(--color-border-light)] dark:hover:bg-gray-800'
      )}
      aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
      title="Messages"
    >
      <span className="relative inline-flex">
        <ICONS.messages size={iconSize} strokeWidth={1.5} />
        {unread > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-red-500 dark:border-[#242526]"
            aria-hidden
          />
        ) : null}
      </span>
    </Link>
  );
}
