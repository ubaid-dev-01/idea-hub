'use client';

import Image from 'next/image';
import { useMemo } from 'react';

import { cn } from '@/components/ui/cn';

const PALETTE = [
  'bg-violet-500',
  'bg-brand',
  'bg-accent-600',
  'bg-sky-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-600',
  'bg-fuchsia-600',
];

function hashUser(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
} as const;

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  online,
  className,
}: {
  src?: string | null;
  alt?: string;
  fallback: string;
  size?: keyof typeof sizeMap;
  online?: boolean;
  className?: string;
}) {
  const initials = useMemo(() => {
    const parts = fallback.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return fallback.slice(0, 2).toUpperCase() || '?';
  }, [fallback]);

  const bg = PALETTE[hashUser(fallback) % PALETTE.length];

  return (
    <div
      className={cn('relative inline-flex shrink-0', sizeMap[size], className)}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || fallback}
          fill
          className="rounded-full object-cover ring-2 ring-[var(--color-surface)] dark:ring-[var(--color-surface)]"
          unoptimized
        />
      ) : (
        <span
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full font-semibold text-white ring-2 ring-[var(--color-surface)]',
            bg
          )}
          aria-hidden
        >
          {initials}
        </span>
      )}
      {online ? (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-accent dark:border-[var(--color-surface)]"
          title="Online"
        />
      ) : null}
    </div>
  );
}
