'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Radio } from 'lucide-react';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { liveRoomsApi } from '@/lib/api/live.api';
import { useAuthStore } from '@/store/authStore';

const CATEGORIES = [
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
] as const;

export default function LiveRoomsPage() {
  return (
    <AuthGuard>
      <LiveRoomsContent />
    </AuthGuard>
  );
}

function LiveRoomsContent() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [scheduledFor, setScheduledFor] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['live-rooms', 'list'],
    queryFn: () => liveRoomsApi.list({ status: 'scheduled' }),
    retry: false,
  });

  const liveQ = useQuery({
    queryKey: ['live-rooms', 'live-now'],
    queryFn: () => liveRoomsApi.listLiveNow(),
    retry: false,
    refetchInterval: 15_000,
  });

  const createMut = useMutation({
    mutationFn: () =>
      liveRoomsApi.create({
        title: title.trim(),
        description: description.trim(),
        category,
        scheduledFor: scheduledFor
          ? new Date(scheduledFor).toISOString()
          : undefined,
      }),
    onSuccess: (room) => {
      toast.success('Room created');
      setTitle('');
      setDescription('');
      setScheduledFor('');
      void qc.invalidateQueries({ queryKey: ['live-rooms'] });
      window.location.href = `/live/${room._id}`;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Radio className="h-6 w-6 text-red-500" />
        <h1 className="text-xl font-bold text-[var(--text)]">Live rooms</h1>
      </div>

      {liveQ.data && liveQ.data.length > 0 ? (
        <div className="mb-8 space-y-2">
          <p className="text-xs font-semibold uppercase text-red-600 dark:text-red-300">
            Live now
          </p>
          {liveQ.data.map((r) => (
            <Link
              key={r._id}
              href={`/live/${r._id}`}
              className={cn(
                'block rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3',
                'hover:border-red-400/40'
              )}
            >
              <p className="font-medium text-[var(--text)]">{r.title}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {r.participants?.filter((p) => !p.leftAt).length ?? 0} joined
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 dark:border-slate-700/50 dark:bg-[#18191a]">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          Start a room
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          You are hosting as @{user?.username}. Schedule a time or start soon
          and tap Go live on the room page.
        </p>
        <div className="mt-4 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title — e.g. Let's discuss my EdTech idea"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="min-h-[80px] w-full rounded-btn border border-[var(--border)] bg-transparent px-3 py-2 text-sm dark:border-slate-600/50"
          />
          <div className="flex flex-wrap gap-2">
            <label className="text-xs text-[var(--text-muted)]">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ml-2 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Start time (optional)
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="ml-2 rounded border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
              />
            </label>
          </div>
          <Button
            type="button"
            onClick={() => {
              if (!title.trim()) {
                toast.error('Add a title');
                return;
              }
              createMut.mutate();
            }}
            disabled={createMut.isPending}
          >
            Create room
          </Button>
        </div>
      </section>

      <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">
        Scheduled
      </h2>
      {isError ? (
        <p className="text-sm text-[var(--text-muted)]">
          {error instanceof Error ? error.message : 'Could not load rooms'}
        </p>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : null}
      <ul className="space-y-2">
        {(data?.rooms ?? []).map((r) => (
          <li key={r._id}>
            <Link
              href={`/live/${r._id}`}
              className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-brand/30 dark:border-slate-700/50 dark:bg-[#18191a]"
            >
              <p className="font-medium text-[var(--text)]">{r.title}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {new Date(r.scheduledFor).toLocaleString()}
              </p>
            </Link>
          </li>
        ))}
      </ul>
      {!isLoading && (data?.rooms?.length ?? 0) === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          No scheduled rooms. Create one above.
        </p>
      ) : null}
    </div>
  );
}
