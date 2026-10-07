'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { ideasApi } from '@/lib/api/ideas.api';
import { resolveAuthor } from '@/lib/author';
import { useAuthStore } from '@/store/authStore';
import type { IIdea } from '@/types/api';

const R = 52;
const C = 2 * Math.PI * R;

function gaugeColor(total: number): string {
  if (total <= 40) return '#ef4444';
  if (total <= 70) return '#f59e0b';
  return '#10b981';
}

function labelMarketSize(v: string): string {
  const m: Record<string, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    massive: 'Massive',
  };
  return m[v] ?? v;
}

function labelCompetition(v: string): string {
  const m: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };
  return m[v] ?? v;
}

function labelFeasibility(v: string): string {
  const m: Record<string, string> = {
    hard: 'Hard',
    medium: 'Medium',
    easy: 'Easy',
  };
  return m[v] ?? v;
}

function labelTiming(v: string): string {
  const m: Record<string, string> = {
    too_early: 'Too early',
    perfect: 'Perfect',
    too_late: 'Too late',
  };
  return m[v] ?? v;
}

function dotClass(kind: 'good' | 'mid' | 'bad', value: string): string {
  if (kind === 'good') {
    if (value === 'large' || value === 'massive' || value === 'low' || value === 'easy' || value === 'perfect')
      return 'bg-emerald-500';
    if (value === 'medium') return 'bg-amber-500';
    return 'bg-red-500';
  }
  if (kind === 'mid') {
    if (value === 'low' || value === 'easy' || value === 'perfect') return 'bg-emerald-500';
    if (value === 'medium') return 'bg-amber-500';
    return 'bg-red-500';
  }
  // bad = higher competition / harder / wrong timing is worse
  if (value === 'high' || value === 'hard' || value === 'too_late' || value === 'too_early')
    return 'bg-amber-500';
  if (value === 'medium') return 'bg-amber-400';
  return 'bg-emerald-500';
}

export function validationEngineEnabled(): boolean {
  return (
    String(process.env.NEXT_PUBLIC_ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() ===
    'true'
  );
}

export function ValidationScoreCard({ idea }: { idea: IIdea }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const author = resolveAuthor(idea.authorId);
  const isAuthor = Boolean(user && author && user._id === author._id);
  const vs = idea.validationScore;

  const recalc = useMutation({
    mutationFn: () => ideasApi.recalculateValidation(idea._id),
    onSuccess: (updated) => {
      queryClient.setQueryData(['idea', idea._id], updated);
      updateIdeaInFeedCaches(queryClient, updated);
      toast.success('Viability score updated');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Could not refresh score');
    },
  });

  if (!validationEngineEnabled()) return null;

  if (idea.status !== 'published') {
    return (
      <div className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)] dark:border-gray-700">
        Viability scoring is available when this idea is published.
      </div>
    );
  }

  if (!vs) {
    return (
      <div className="space-y-3 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Viability score
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          We&apos;re computing your first score from community signals and AI
          market analysis. This usually takes under a minute after the idea
          goes live.
        </p>
        {isAuthor ? (
          <Button
            type="button"
            size="sm"
            loading={recalc.isPending}
            onClick={() => void recalc.mutateAsync()}
          >
            Calculate now
          </Button>
        ) : null}
      </div>
    );
  }

  const pct = clamp(vs.total, 0, 100);
  const offset = C * (1 - pct / 100);
  const stroke = gaugeColor(vs.total);

  return (
    <div className="space-y-4 rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-card dark:border-gray-700">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Viability score
        </h3>
        {vs.trend === 'rising' ? (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <TrendingUp size={14} strokeWidth={1.5} aria-hidden />
            Rising
          </span>
        ) : vs.trend === 'falling' ? (
          <span className="flex items-center gap-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <TrendingDown size={14} strokeWidth={1.5} aria-hidden />
            Falling
          </span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">Stable</span>
        )}
      </div>

      <div className="flex flex-col items-center">
        <div className="relative h-[124px] w-[124px]">
          <svg
            className="-rotate-90 transform"
            width={124}
            height={124}
            viewBox="0 0 124 124"
            aria-hidden
          >
            <circle
              cx={62}
              cy={62}
              r={R}
              fill="none"
              stroke="var(--color-border-light)"
              strokeWidth={10}
              className="dark:stroke-gray-700"
            />
            <circle
              cx={62}
              cy={62}
              r={R}
              fill="none"
              stroke={stroke}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{ color: stroke }}
            >
              {vs.total}
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">/ 100</span>
          </div>
        </div>
        <p className="mt-1 text-center text-[10px] text-[var(--color-text-muted)]">
          Updated {new Date(vs.lastCalculated).toLocaleString()}
        </p>
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-secondary)]">Market size</span>
          <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                dotClass('good', vs.breakdown.marketSize)
              )}
            />
            {labelMarketSize(vs.breakdown.marketSize)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-secondary)]">Competition</span>
          <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                dotClass('mid', vs.breakdown.competition)
              )}
            />
            {labelCompetition(vs.breakdown.competition)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-secondary)]">Feasibility</span>
          <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                dotClass('mid', vs.breakdown.feasibility)
              )}
            />
            {labelFeasibility(vs.breakdown.feasibility)}
          </span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-secondary)]">Timing</span>
          <span className="flex items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                dotClass('mid', vs.breakdown.timing)
              )}
            />
            {labelTiming(vs.breakdown.timing)}
          </span>
        </li>
      </ul>

      {vs.insights.strengths.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Strengths
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-[var(--color-text-secondary)]">
            {vs.insights.strengths.slice(0, 5).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {vs.insights.risks.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Risks
          </p>
          <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-[var(--color-text-secondary)]">
            {vs.insights.risks.slice(0, 5).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() =>
          toast(
            'Full downloadable AI reports are coming soon. You can refresh the score anytime.',
            { duration: 4000 }
          )
        }
      >
        Get full AI report →
      </Button>

      {isAuthor ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          loading={recalc.isPending}
          onClick={() => void recalc.mutateAsync()}
        >
          Refresh score (full AI pass)
        </Button>
      ) : null}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function updateIdeaInFeedCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  idea: IIdea
): void {
  queryClient.setQueriesData<{ pages: Array<{ ideas: IIdea[] }>; pageParams: unknown[] }>(
    { queryKey: ['feed'] },
    (old) => {
      if (!old?.pages) return old;
      return {
        ...old,
        pages: old.pages.map((p) => ({
          ...p,
          ideas: p.ideas.map((i) => (i._id === idea._id ? idea : i)),
        })),
      };
    }
  );
}
