'use client';

import type { ReactNode } from 'react';

import { cn } from '@/components/ui/cn';

export function Badge({
  children,
  className,
  variant = 'default',
}: {
  children: ReactNode;
  className?: string;
  variant?:
    | 'default'
    | 'brand'
    | 'accent'
    | 'warning'
    | 'danger'
    | 'muted';
}) {
  const v = {
    default: 'bg-surface2 text-[var(--text)]',
    brand: 'bg-brand/15 text-brand-700 dark:text-brand-50',
    accent: 'bg-accent/15 text-emerald-800 dark:text-accent',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    muted: 'bg-[var(--surface2)] text-[var(--text-muted)]',
  }[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        v,
        className
      )}
    >
      {children}
    </span>
  );
}
