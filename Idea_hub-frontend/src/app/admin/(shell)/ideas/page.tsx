'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';
import type { IIdea, IdeaStatus } from '@/types/api';

const STATUSES: IdeaStatus[] = [
  'draft',
  'pending_review',
  'ai_scanning',
  'published',
  'rejected',
  'archived',
  'flagged',
];

function IdeaRow({ idea }: { idea: IIdea }) {
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['admin', 'ideas'] });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      adminApi.updateIdeaStatus(idea._id, status, 'admin'),
    onSuccess: () => {
      toast.success('Idea updated');
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminApi.deleteIdea(idea._id),
    onSuccess: () => {
      toast.success('Idea removed');
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const scorePct = Math.round((idea.contentScanScore ?? 0) * 100);

  return (
    <>
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this idea?"
        confirmLabel="Delete permanently"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={async () => {
          await deleteMut.mutateAsync();
          setDeleteOpen(false);
        }}
      >
        <p>
          <span className="font-semibold text-cyan-200">“{idea.title}”</span> and all
          comments, likes, and saves will be removed. This cannot be undone.
        </p>
      </ConfirmModal>
    <tr className="border-b border-cyan-500/10 align-middle">
      <td className="p-3">
        <p className="font-medium text-white">{idea.title}</p>
        <p className="text-xs text-slate-500 line-clamp-1">{idea.slug}</p>
      </td>
      <td className="p-3">
        <select
          className="w-full max-w-[160px] rounded-lg border border-cyan-500/25 bg-[#0b111b] px-2 py-1.5 text-xs text-slate-200"
          value={idea.status}
          disabled={statusMut.isPending}
          onChange={(e) => statusMut.mutate(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="p-3 tabular-nums text-slate-300">{scorePct}%</td>
      <td className="p-3">
        <Badge
          variant="muted"
          className="border-cyan-500/20 text-slate-300 capitalize"
        >
          {idea.visibility}
        </Badge>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
            disabled={statusMut.isPending}
            onClick={() => statusMut.mutate('published')}
          >
            Publish
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="border-amber-500/30 bg-amber-500/10 text-amber-200"
            disabled={statusMut.isPending}
            onClick={() => statusMut.mutate('rejected')}
          >
            Reject
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={statusMut.isPending}
            onClick={() => statusMut.mutate('archived')}
          >
            Archive
          </Button>
          <Link
            href={`/ideas/${idea._id}`}
            className="inline-flex items-center rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-500/10"
          >
            View
          </Link>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={deleteMut.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
    </>
  );
}

export default function AdminIdeasPage() {
  const q = useQuery({
    queryKey: ['admin', 'ideas'],
    queryFn: () => adminApi.getIdeas({}),
  });

  if (q.isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl bg-cyan-500/10" />;
  }

  if (q.isError) {
    return (
      <div className="rounded-xl border border-red-500/30 p-6 text-red-300">
        {extractApiError(q.error)}
        <Button className="mt-4" onClick={() => void q.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const ideas = q.data?.ideas ?? [];

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="mb-2 text-2xl font-bold text-white">All ideas</h1>
      <p className="mb-6 text-sm text-slate-400">
        Change status, publish / reject / archive, or permanently delete a post
        (comments, likes, saves removed).
      </p>
      {!ideas.length ? (
        <p className="text-slate-500">No ideas.</p>
      ) : (
        <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-cyan-500/20 bg-[#0b111b]/50 [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-cyan-500/15 bg-cyan-500/5">
              <tr>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Title
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Status
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Score
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Visibility
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => (
                <IdeaRow key={idea._id} idea={idea} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
