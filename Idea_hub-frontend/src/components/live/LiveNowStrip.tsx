'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Radio } from 'lucide-react';

import { cn } from '@/components/ui/cn';
import { liveRoomsApi } from '@/lib/api/live.api';

export function LiveNowStrip() {
  const { data, isError } = useQuery({
    queryKey: ['live-rooms', 'live-now'],
    queryFn: () => liveRoomsApi.listLiveNow(),
    refetchInterval: 20_000,
    retry: false,
  });

  if (isError || !data?.length) return null;

  return (
    <div
      className={cn(
        'mb-3 overflow-hidden rounded-2xl border',
        'border-red-500/25 bg-gradient-to-r from-red-500/10 via-rose-500/5 to-transparent',
        'dark:border-red-400/20 dark:from-red-500/15'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-600 dark:text-red-300">
          <Radio className="h-4 w-4 animate-pulse" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-200">
          Live now
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 pb-3 [scrollbar-width:thin]">
        {data.map((room) => (
          <Link
            key={room._id}
            href={`/live/${room._id}`}
            className={cn(
              'shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2',
              'transition-colors hover:border-red-400/40 hover:bg-red-500/5',
              'dark:border-slate-700/60 dark:bg-[#18191a]'
            )}
          >
            <p className="max-w-[200px] truncate text-sm font-medium text-[var(--text)]">
              {room.title}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {room.participants?.filter((p) => !p.leftAt).length ?? 0} in room
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
