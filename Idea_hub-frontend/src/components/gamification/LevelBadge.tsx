'use client';

import { Zap } from 'lucide-react';

import { cn } from '@/components/ui/cn';

export function LevelBadge({
  level,
  levelTitle,
  emoji,
  size = 'sm',
  className,
}: {
  level: number;
  levelTitle: string;
  emoji?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const label = `Level ${level} — ${levelTitle}`;
  const dim = size === 'md' ? 'h-9 w-9 text-sm' : 'h-7 w-7 text-xs';
  return (
    <span
      className={cn('inline-flex shrink-0', className)}
      title={label}
      aria-label={label}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-brand/20 to-indigo-500/25 font-bold text-brand ring-2 ring-inset ring-amber-200/80 dark:text-indigo-300 dark:ring-amber-700/50',
          dim
        )}
      >
        <Zap className="h-4 w-4" aria-hidden />
      </span>
    </span>
  );
}
