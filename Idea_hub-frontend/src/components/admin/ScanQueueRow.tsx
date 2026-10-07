'use client';

import type { ScanQueueIdea } from '@/types/api';
import { cn } from '@/components/ui/cn';
import { formatRelative } from '@/lib/utils';
import { resolveAuthor } from '@/lib/author';

export function ScanQueueRow({
  idea,
  onSelect,
  selected,
}: {
  idea: ScanQueueIdea;
  onSelect: () => void;
  selected: boolean;
}) {
  const author = resolveAuthor(idea.authorId);
  const score = idea.contentScanScore ?? 0;
  const violations =
    idea.contentScanReport?.violations ?? idea.media?.flatMap((m) => m.scanViolations) ?? [];

  return (
    <tr
      className={cn(
        'cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-surface2',
        selected && 'bg-brand/5'
      )}
      onClick={onSelect}
    >
      <td className="px-3 py-3 text-sm font-medium text-[var(--text)]">
        {idea.title}
      </td>
      <td className="px-3 py-3 text-sm text-[var(--text-muted)]">
        @{author?.username ?? '—'}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            'rounded-md px-2 py-0.5 text-xs font-semibold',
            score >= 0.85
              ? 'bg-emerald-100 text-emerald-800'
              : score >= 0.5
                ? 'bg-amber-100 text-amber-900'
                : 'bg-red-100 text-red-800'
          )}
        >
          {(score * 100).toFixed(0)}%
        </span>
      </td>
      <td className="max-w-[200px] truncate px-3 py-3 text-xs text-[var(--text-muted)]">
        {violations.slice(0, 3).join(', ') || '—'}
      </td>
      <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
        {formatRelative(idea.createdAt)}
      </td>
    </tr>
  );
}
