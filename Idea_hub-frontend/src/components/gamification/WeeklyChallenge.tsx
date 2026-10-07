'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/components/ui/cn';
import type { IUserProgressWeeklyChallenge } from '@/types/api';

function challengeEndsAt(weekOfIso: string): number {
  const start = new Date(weekOfIso);
  if (Number.isNaN(start.getTime())) return Date.now() + 86400000;
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return end.getTime();
}

export function WeeklyChallenge({
  challenge,
}: {
  challenge: IUserProgressWeeklyChallenge | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!challenge) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)] dark:border-gray-700">
        No weekly challenge loaded.
      </div>
    );
  }

  const end = challengeEndsAt(challenge.weekOf);
  const msLeft = Math.max(0, end - now);
  const h = Math.floor(msLeft / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  const pct = Math.min(
    100,
    Math.round((challenge.progress / Math.max(1, challenge.target)) * 100)
  );

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm dark:border-slate-700/50 dark:bg-[#18191a]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-brand dark:text-indigo-400">
        Weekly challenge
      </p>
      <h3 className="mt-1 text-sm font-bold text-[var(--color-text-primary)]">
        {challenge.title}
      </h3>
      <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">
        {challenge.description}
      </p>
      <div className="mt-2">
        <div className="mb-0.5 flex justify-between text-[10px] text-[var(--color-text-muted)]">
          <span>
            {challenge.progress} / {challenge.target}
          </span>
          <span>
            {challenge.completed ? 'Done ✓' : `${h}h ${m}m left`}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border-light)] dark:bg-gray-700">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              challenge.completed
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-brand to-violet-500'
            )}
            style={{ width: `${challenge.completed ? 100 : pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
