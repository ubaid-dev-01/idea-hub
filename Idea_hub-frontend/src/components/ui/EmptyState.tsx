'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/components/ui/cn';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 py-16 text-center',
        className
      )}
    >
      <Icon
        className="mb-4 text-[var(--color-text-muted)]"
        size={48}
        strokeWidth={1.25}
        aria-hidden
      />
      <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">
        {title}
      </h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
