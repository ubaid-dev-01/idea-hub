'use client';

import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { ICONS } from '@/lib/icons';
import { usersApi } from '@/lib/api/users.api';
import { extractApiError } from '@/lib/api/errors';
import { AuthGuard } from '@/components/providers/AuthGuard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';
import type { IIdea } from '@/types/api';

function ideaThumb(idea: IIdea): string | null {
  const m = idea.media?.[0];
  if (!m) return null;
  return m.thumbnailUrl || m.cdnUrl || m.firebaseUrl || null;
}

function authorHandle(idea: IIdea): string {
  const a = idea.authorId;
  if (a && typeof a === 'object' && 'username' in a) {
    return `@${(a as { username: string }).username}`;
  }
  return '';
}

export default function CollaborationsPage() {
  return (
    <AuthGuard>
      <CollaborationsInner />
    </AuthGuard>
  );
}

function CollaborationsInner() {
  const q = useQuery({
    queryKey: ['users', 'me', 'collaborations'],
    queryFn: () => usersApi.getMyCollaborations(),
  });

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-3 py-6 md:px-4">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          {extractApiError(q.error)}
        </p>
        <Button className="mt-4" onClick={() => void q.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const { accepted, pending } = q.data;
  const empty = accepted.length === 0 && pending.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-3 py-6 md:px-4">
      <header>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] md:text-2xl">
          Collaborations
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Ideas you&apos;re collaborating on after the author accepts your request.
        </p>
      </header>

      {pending.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Pending requests
          </h2>
          <ul className="space-y-2">
            {pending.map((row) => (
              <li
                key={row.idea._id + row.createdAt}
                className={cn(
                  'flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/25'
                )}
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--color-border-light)] dark:bg-gray-800">
                  {ideaThumb(row.idea) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ideaThumb(row.idea)!}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ICONS.myIdeas className="h-6 w-6 text-[var(--color-text-muted)]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/ideas/${row.idea._id}`}
                    className="font-medium text-[var(--color-text-primary)] hover:underline"
                  >
                    {row.idea.title}
                  </Link>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {authorHandle(row.idea)} · Sent{' '}
                    {format(parseISO(row.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-200/90">
                    Waiting for author
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {accepted.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Active collaborations
          </h2>
          <ul className="space-y-2">
            {accepted.map((row) => (
              <li
                key={row.idea._id + row.acceptedAt}
                className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 dark:border-gray-700"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--color-border-light)] dark:bg-gray-800">
                  {ideaThumb(row.idea) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ideaThumb(row.idea)!}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ICONS.myIdeas className="h-6 w-6 text-[var(--color-text-muted)]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/ideas/${row.idea._id}`}
                    className="font-medium text-[var(--color-text-primary)] hover:underline"
                  >
                    {row.idea.title}
                  </Link>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {authorHandle(row.idea)} · {row.idea.category} · Accepted{' '}
                    {format(parseISO(row.acceptedAt), 'MMM d, yyyy')}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {row.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {empty ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] py-16 text-center dark:border-slate-700/50">
          <ICONS.collaborations
            className="mb-3 text-[var(--color-text-muted)]"
            size={48}
            strokeWidth={1.25}
          />
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">
            No collaborations yet. Browse the feed and request to collaborate on
            ideas that are open for collaborators.
          </p>
          <Button asChild className="mt-6">
            <Link href="/feed">Go to feed</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
