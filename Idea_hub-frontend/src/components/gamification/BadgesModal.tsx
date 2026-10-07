'use client';

import { PortalModal } from '@/components/gamification/PortalModal';
import { cn } from '@/components/ui/cn';
import { useBadgesCatalog } from '@/hooks/useGamification';

const rarityStyle: Record<string, string> = {
  common: 'border-slate-300/60 dark:border-slate-600',
  rare: 'border-sky-400/70 dark:border-sky-500',
  epic: 'border-violet-500/70 dark:border-violet-400',
  legendary: 'border-amber-400 dark:border-amber-500',
};

export function BadgesModal({
  open,
  onClose,
  earnedIds,
}: {
  open: boolean;
  onClose: () => void;
  earnedIds: Set<string>;
}) {
  const q = useBadgesCatalog();
  const list = q.data ?? [];

  return (
    <PortalModal open={open} onClose={onClose} title="Badges" wide>
      {q.isLoading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : q.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Could not load badges.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((b) => {
            const earned = earnedIds.has(b.id);
            return (
              <li
                key={b.id}
                className={cn(
                  'rounded-xl border-2 p-3 text-center transition',
                  earned
                    ? cn('bg-[var(--color-surface)]', rarityStyle[b.rarity] ?? '')
                    : 'border-dashed border-[var(--color-border)] opacity-50 grayscale dark:border-gray-600'
                )}
                title={b.description}
              >
                <div
                  className={cn(
                    'mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-2xl',
                    earned ? 'bg-brand/15' : 'bg-[var(--color-border-light)]'
                  )}
                  aria-hidden
                >
                  {earned ? '✓' : '?'}
                </div>
                <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                  {b.name}
                </p>
                <p className="mt-1 line-clamp-3 text-[10px] text-[var(--color-text-muted)]">
                  {b.description}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </PortalModal>
  );
}
