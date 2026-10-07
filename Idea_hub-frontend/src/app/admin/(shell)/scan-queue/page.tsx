'use client';

import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { ScanQueueRow } from '@/components/admin/ScanQueueRow';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';
import type { ScanQueueIdea } from '@/types/api';
import { resolveAuthor } from '@/lib/author';

export default function ScanQueuePage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'scan-queue'],
    queryFn: () => adminApi.getScanQueue(),
  });
  const [selected, setSelected] = useState<ScanQueueIdea | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);

  const decide = useMutation({
    mutationFn: ({
      id,
      approved,
      reason,
    }: {
      id: string;
      approved: boolean;
      reason?: string;
    }) => adminApi.decideScanItem(id, approved, reason),
    onSuccess: () => {
      toast.success('Decision saved');
      void qc.invalidateQueries({ queryKey: ['admin', 'scan-queue'] });
      setSelected(null);
      setRejectOpen(false);
      setConfirmApprove(false);
      setRejectReason('');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  if (q.isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (q.isError) {
    return (
      <div className="text-red-600">
        {extractApiError(q.error)}
        <Button className="mt-2" onClick={() => void q.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const rows = q.data ?? [];
  const author = selected ? resolveAuthor(selected.authorId) : null;

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <h1 className="mb-6 text-2xl font-bold text-[var(--text)]">
          Scan queue
        </h1>
        {!rows.length ? (
          <p className="text-[var(--text-muted)]">Queue is empty.</p>
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-[var(--border)] [-webkit-overflow-scrolling:touch]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-surface2">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Author</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Violations</th>
                  <th className="p-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((idea) => (
                  <ScanQueueRow
                    key={idea._id}
                    idea={idea}
                    selected={selected?._id === idea._id}
                    onSelect={() => setSelected(idea)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected ? (
        <aside className="w-full max-w-full shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:sticky lg:top-24 lg:max-w-md lg:self-start">
          <h2 className="text-lg font-semibold text-[var(--text)]">Preview</h2>
          <p className="mt-2 font-medium">{selected.title}</p>
          <p className="text-sm text-[var(--text-muted)]">
            @{author?.username} · {(selected.contentScanScore * 100).toFixed(0)}%
          </p>
          <div className="prose prose-sm mt-4 max-h-48 overflow-y-auto dark:prose-invert">
            <ReactMarkdown>{selected.description}</ReactMarkdown>
          </div>
          {selected.contentScanReport ? (
            <div className="mt-4 space-y-2 text-xs">
              <p>
                Text {(selected.contentScanReport.textScore * 100).toFixed(0)}%
              </p>
              <p>
                Image{' '}
                {(selected.contentScanReport.imageScore * 100).toFixed(0)}%
              </p>
              <p>
                Video{' '}
                {(selected.contentScanReport.videoScore * 100).toFixed(0)}%
              </p>
              <p>
                Doc {(selected.contentScanReport.docScore * 100).toFixed(0)}%
              </p>
              <div className="flex flex-wrap gap-1">
                {selected.contentScanReport.violations.map((v) => (
                  <span
                    key={v}
                    className="rounded bg-red-100 px-2 py-0.5 text-red-800"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setConfirmApprove(true)}>
              Approve
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => setRejectOpen(true)}
            >
              Reject
            </Button>
          </div>
        </aside>
      ) : null}

      <Modal
        isOpen={confirmApprove}
        onClose={() => setConfirmApprove(false)}
        title="Approve idea?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmApprove(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selected &&
                decide.mutate({ id: selected._id, approved: true })
              }
              loading={decide.isPending}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-muted)]">
          This will publish the idea for all users.
        </p>
      </Modal>

      <Modal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject idea"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={rejectReason.trim().length < 20}
              loading={decide.isPending}
              onClick={() =>
                selected &&
                decide.mutate({
                  id: selected._id,
                  approved: false,
                  reason: rejectReason,
                })
              }
            >
              Reject
            </Button>
          </>
        }
      >
        <p className="mb-2 text-sm text-[var(--text-muted)]">
          Reason (min 20 characters)
        </p>
        <textarea
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
