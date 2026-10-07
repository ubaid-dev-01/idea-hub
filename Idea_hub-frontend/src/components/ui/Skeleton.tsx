'use client';

import { cn } from '@/components/ui/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-skeleton rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ['w-full', 'w-[92%]', 'w-4/5', 'w-3/4', 'w-[88%]'];
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const sz =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-16 w-16' : 'h-10 w-10';
  return <Skeleton className={cn(sz, 'rounded-full')} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-card dark:border-gray-700',
        className
      )}
    >
      <div className="flex gap-3">
        <SkeletonAvatar />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="mt-4 aspect-[4/3] w-full rounded-lg" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  cols = 3,
  rows = 2,
  className,
}: {
  cols?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('grid gap-2', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}
