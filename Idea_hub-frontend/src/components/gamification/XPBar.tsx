'use client';

import { useState } from 'react';

import { PortalModal } from '@/components/gamification/PortalModal';
import { BadgesModal } from '@/components/gamification/BadgesModal';
import { cn } from '@/components/ui/cn';
import type { IUserProgress } from '@/types/api';

function pct(p: IUserProgress): number {
  const cur = p.xpIntoLevel ?? 0;
  const need = p.xpToNext ?? 1;
  if (need <= 0) return 100;
  return Math.min(100, Math.round((cur / (cur + need)) * 100));
}

export function XPBar({ progress }: { progress: IUserProgress }) {
  const [open, setOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const fill = pct(progress);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 w-full max-w-[11rem] text-left"
        aria-label="Open progress details"
      >
        <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px] text-[var(--color-text-muted)]">
          <span>
            Lv {progress.level} · {progress.levelTitle}
          </span>
          <span>{progress.totalXP} XP</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border-light)] dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={fill}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r from-brand to-indigo-500 transition-all duration-300'
            )}
            style={{ width: `${fill}%` }}
          />
        </div>
      </button>

      <PortalModal
        open={open}
        onClose={() => setOpen(false)}
        title="Your progress"
        wide
      >
        <div className="space-y-4 text-sm text-[var(--color-text-secondary)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {progress.levelEmoji}
            </span>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">
                Level {progress.level} — {progress.levelTitle}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {progress.totalXP} total XP · {progress.weeklyXpEarned} XP this
                week
              </p>
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Next level</span>
              <span>
                {progress.xpIntoLevel} / {progress.xpIntoLevel + progress.xpToNext}{' '}
                XP
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border-light)] dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-indigo-500"
                style={{ width: `${fill}%` }}
              />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--color-border-light)]/50 p-2 dark:bg-gray-800/80">
              <dt className="text-[var(--color-text-muted)]">Ideas</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">
                {progress.ideasPosted}
              </dd>
            </div>
            <div className="rounded-lg bg-[var(--color-border-light)]/50 p-2 dark:bg-gray-800/80">
              <dt className="text-[var(--color-text-muted)]">Collabs joined</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">
                {progress.collaborationsJoined}
              </dd>
            </div>
            <div className="rounded-lg bg-[var(--color-border-light)]/50 p-2 dark:bg-gray-800/80">
              <dt className="text-[var(--color-text-muted)]">Badges</dt>
              <dd className="font-semibold text-[var(--color-text-primary)]">
                {progress.badges.length}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--color-border)] py-2 text-sm font-semibold text-brand hover:bg-brand/5 dark:border-gray-600"
            onClick={() => {
              setOpen(false);
              setBadgesOpen(true);
            }}
          >
            View all badges
          </button>
        </div>
      </PortalModal>

      <BadgesModal
        open={badgesOpen}
        onClose={() => setBadgesOpen(false)}
        earnedIds={new Set(progress.badges.map((b) => b.badgeId))}
      />
    </>
  );
}
