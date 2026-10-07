'use client';

import { format } from 'date-fns';
import { RotateCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';

export default function AdminDashboardPage() {
  const statsQ = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.getStats(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const now = new Date();

  if (statsQ.isLoading) {
    return (
      <div className="w-full min-w-0 space-y-6">
        <Skeleton className="h-7 w-48" />
        <div className="grid min-w-0 grid-cols-2 gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Skeleton className="h-[280px] lg:col-span-3" />
          <Skeleton className="h-[280px] lg:col-span-2" />
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[220px]" />
          <Skeleton className="h-[220px]" />
        </div>
      </div>
    );
  }

  if (statsQ.isError || !statsQ.data) {
    return (
      <div className="border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <p>{extractApiError(statsQ.error)}</p>
        <Button className="mt-3" onClick={() => void statsQ.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="mb-8 flex flex-col gap-2 border-b border-[var(--lh-line)] pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="landing-eyebrow">Admin dashboard · Idea Hub</p>
          <h1 className="landing-display mt-2 text-2xl font-semibold tracking-tight text-[var(--lh-ink)] md:text-3xl">
            Overview
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--lh-muted)]">
            <span>
              Last updated:{' '}
              {statsQ.dataUpdatedAt
                ? format(new Date(statsQ.dataUpdatedAt), 'h:mm:ss a')
                : '—'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px]"
              disabled={statsQ.isFetching}
              onClick={() => void statsQ.refetch()}
            >
              <RotateCw
                className={cn('h-3.5 w-3.5', statsQ.isFetching && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>
        </div>
        <p className="text-xs tabular-nums text-[var(--lh-muted)]">
          {format(now, 'EEEE, MMM d, yyyy · h:mm a')}
        </p>
      </div>
      <AdminDashboardCharts stats={statsQ.data} />
    </div>
  );
}
