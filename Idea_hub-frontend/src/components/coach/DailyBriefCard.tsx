'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { coachApi } from '@/lib/api/coach.api';
import { isAiCoachUiEnabled } from '@/lib/ai-coach-ui';
import { useAuthStore } from '@/store/authStore';

export function DailyBriefCard() {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);

  const q = useQuery({
    queryKey: ['coach', 'daily-brief'],
    queryFn: () => coachApi.dailyBrief(),
    enabled: isAiCoachUiEnabled() && Boolean(accessToken),
    retry: false,
    staleTime: 60_000,
  });

  const dismissMut = useMutation({
    mutationFn: () => coachApi.dismissBrief(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['coach', 'daily-brief'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAiCoachUiEnabled()) return null;
  if (q.isError || !q.data?.brief) return null;
  if (q.data.dismissed) return null;

  const b = q.data.brief;

  return (
    <div
      className={cn(
        'relative mb-4 overflow-hidden rounded-2xl border',
        'border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent',
        'dark:border-indigo-400/20 dark:from-indigo-500/15'
      )}
    >
      <button
        type="button"
        onClick={() => dismissMut.mutate()}
        className="absolute right-2 top-2 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Dismiss brief"
        disabled={dismissMut.isPending}
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 p-4 pr-10">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            Your AI coach · Daily brief
          </p>
          <p className="mt-1 text-sm font-semibold text-[var(--text)]">
            {b.greeting}
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-muted)]">
            {(expanded ? b.summaryLines : b.summaryLines.slice(0, 2)).map(
              (line, i) => (
                <li key={i}>{line}</li>
              )
            )}
          </ul>
          {b.summaryLines.length > 2 ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-brand"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Full brief
                </>
              )}
            </button>
          ) : null}
          {expanded ? (
            <div className="mt-3 space-y-2 border-t border-indigo-500/20 pt-3 text-sm dark:border-indigo-400/15">
              <p>
                <span className="font-semibold text-[var(--text)]">
                  Today&apos;s challenge:
                </span>{' '}
                {b.todayChallenge.title} (+{b.todayChallenge.xpReward} XP){' '}
                — {b.todayChallenge.description}
              </p>
              <p className="text-[var(--text-muted)]">{b.trendingInsight}</p>
              <p className="italic text-[var(--text)]">{b.motivationalMessage}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
