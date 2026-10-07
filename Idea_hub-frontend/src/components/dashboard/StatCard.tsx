'use client';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/components/ui/cn';

export function StatCard({
  label,
  value,
  subLabel,
  icon: Icon,
  trendPct,
}: {
  label: string;
  value: number | string;
  subLabel?: string;
  icon: LucideIcon;
  /** @deprecated kept for call-site compatibility */
  accent?: string;
  trendPct?: number;
  /** @deprecated theme follows global tokens */
  isLight?: boolean;
}) {
  const up = trendPct === undefined ? null : trendPct >= 0;
  return (
    <div className="border-t border-[var(--lh-line)] pt-5">
      <div className="flex items-start justify-between gap-2">
        <Icon className="h-4 w-4 text-[var(--lh-muted)] opacity-70" strokeWidth={2} />
        {trendPct !== undefined ? (
          <span
            className={cn(
              'text-[10px] font-semibold tabular-nums',
              up ? 'text-[var(--lh-accent)]' : 'text-red-600 dark:text-red-400'
            )}
          >
            {up ? '↑' : '↓'} {Math.abs(trendPct)}%
          </span>
        ) : null}
      </div>
      <p className="landing-display mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[var(--lh-ink)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-xs font-medium text-[var(--lh-muted)]">{label}</p>
      {subLabel ? (
        <div className="mt-2 border-t border-[var(--lh-line)] pt-2 text-[11px] text-[var(--lh-muted)]">
          {subLabel}
        </div>
      ) : null}
    </div>
  );
}
