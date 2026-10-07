'use client';

import { Flame } from 'lucide-react';

import { cn } from '@/components/ui/cn';
import type { IUserProgress } from '@/types/api';

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function StreakCounter({ progress }: { progress: IUserProgress }) {
  const last = progress.lastActiveDate?.slice(0, 10);
  const activeToday = last === utcToday();
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-sm',
        activeToday
          ? 'border-orange-200/80 bg-orange-50/80 text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-100'
          : 'border-[var(--color-border)] bg-[var(--color-border-light)]/30 text-[var(--color-text-muted)] dark:border-gray-700 dark:bg-gray-800/50'
      )}
    >
      <p className="font-bold">
        <Flame className="mr-1 inline h-4 w-4 text-amber-500" aria-hidden />
        <span className={cn(!activeToday && 'text-amber-800/80 dark:text-amber-200/70')}>
          {progress.currentStreak} day streak
        </span>
      </p>
      {!activeToday ? (
        <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">
          Visit today to keep it going
        </p>
      ) : (
        <p className="mt-0.5 text-xs opacity-80">You&apos;re active today</p>
      )}
      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
        Best: {progress.longestStreak} days
      </p>
    </div>
  );
}
