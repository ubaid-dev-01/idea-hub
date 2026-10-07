'use client';

import { cn } from '@/components/ui/cn';

export function Spinner({
  className,
  size = 'md',
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sz =
    size === 'sm' ? 'h-4 w-4 border-2' : size === 'lg' ? 'h-10 w-10 border-3' : 'h-6 w-6 border-2';
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-brand border-t-transparent',
        sz,
        className
      )}
      aria-hidden
    />
  );
}
