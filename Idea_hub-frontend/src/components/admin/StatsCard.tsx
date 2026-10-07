'use client';

import { cn } from '@/components/ui/cn';

export function StatsCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-t border-[var(--lh-line)] bg-[var(--lh-bg)] pt-4',
        className
      )}
    >
      <p className="landing-eyebrow">{label}</p>
      <p className="landing-display mt-2 text-3xl font-semibold tracking-tight text-[var(--lh-ink)]">
        {value}
      </p>
      {sub ? (
        <p className="mt-1 text-xs text-[var(--lh-muted)]">{sub}</p>
      ) : null}
    </div>
  );
}
