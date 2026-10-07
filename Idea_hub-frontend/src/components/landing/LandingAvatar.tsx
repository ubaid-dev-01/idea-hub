'use client';

import { cn } from '@/components/ui/cn';

export function LandingAvatar({
  initials,
  from,
  to,
  className,
  size = 'md',
}: {
  initials: string;
  from: string;
  to: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass =
    size === 'sm' ? 'h-12 w-12 text-sm' : size === 'lg' ? 'h-28 w-28 text-2xl' : 'h-24 w-24 text-lg';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl font-bold text-white ring-1 ring-slate-200/80 dark:ring-slate-600/50',
        sizeClass,
        className
      )}
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
      aria-hidden
    >
      <span className="relative z-10">{initials}</span>
      <div className="absolute inset-0 bg-white/10" />
    </div>
  );
}
