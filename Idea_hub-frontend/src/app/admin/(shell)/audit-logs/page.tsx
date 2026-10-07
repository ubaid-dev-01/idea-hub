'use client';

import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';
import { formatRelative } from '@/lib/utils';
import { resolveAuthor } from '@/lib/author';

export default function AuditLogsPage() {
  const q = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => adminApi.getAuditLogs({}),
  });

  if (q.isLoading) {
    return <Skeleton className="h-64 w-full" />;
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

  const logs = q.data?.logs ?? [];

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="mb-6 text-2xl font-bold text-[var(--text)]">Audit logs</h1>
      {!logs.length ? (
        <p className="text-[var(--text-muted)]">No entries.</p>
      ) : (
        <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-[var(--border)] [-webkit-overflow-scrolling:touch]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-surface2">
              <tr>
                <th className="p-3">Admin</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const admin = resolveAuthor(log.adminId);
                return (
                  <tr key={log._id} className="border-b border-[var(--border)]">
                    <td className="p-3">@{admin?.username ?? '—'}</td>
                    <td className="p-3">
                      <Badge variant="muted">{log.action}</Badge>
                    </td>
                    <td className="p-3 text-[var(--text-muted)]">
                      {log.targetType} / {log.targetId}
                    </td>
                    <td className="p-3 text-xs text-[var(--text-muted)]">
                      {formatRelative(log.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
