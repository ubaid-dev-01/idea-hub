'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';

export default function AdminCommentsPage() {
  const { isLight } = useAdminTheme();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'comments'],
    queryFn: () => adminApi.getComments({}),
  });

  const hideMut = useMutation({
    mutationFn: (id: string) => adminApi.updateCommentStatus(id, 'hidden'),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'comments'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  if (q.isLoading) {
    return (
      <p className={cn('text-sm', isLight ? 'text-slate-600' : 'text-slate-400')}>
        Loading comments…
      </p>
    );
  }

  if (q.isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
        {extractApiError(q.error)}
      </div>
    );
  }

  const rows = q.data?.comments ?? [];

  return (
    <div className="w-full min-w-0 space-y-4">
      <div>
        <h1
          className={cn(
            'text-xl font-bold tracking-tight md:text-2xl',
            isLight ? 'text-slate-900' : 'text-white'
          )}
        >
          Comments
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Moderate community comments. Hiding removes them from public view.
        </p>
      </div>

      <div
        className={cn(
          'min-w-0 max-w-full overflow-x-auto rounded-xl border [-webkit-overflow-scrolling:touch]',
          isLight ? 'border-slate-200 bg-white' : 'border-cyan-500/20 bg-[#0d1520]'
        )}
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead
            className={cn(
              'border-b text-xs uppercase tracking-wide',
              isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
            )}
          >
            <tr>
              <th className="px-3 py-2 font-medium">Idea</th>
              <th className="px-3 py-2 font-medium">Author</th>
              <th className="px-3 py-2 font-medium">Excerpt</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  No comments found.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c._id}
                  className={cn(
                    'border-t',
                    isLight ? 'border-slate-100' : 'border-white/5'
                  )}
                >
                  <td className="max-w-[180px] px-3 py-2 align-top">
                    <span className="line-clamp-2 text-xs font-medium">
                      {c.ideaTitle || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-500">
                    {c.author ? `@${c.author.username}` : '—'}
                  </td>
                  <td className="max-w-md px-3 py-2 align-top text-xs text-slate-600 dark:text-slate-300">
                    {c.content.length > 160
                      ? `${c.content.slice(0, 160)}…`
                      : c.content}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="rounded bg-slate-500/15 px-2 py-0.5 text-[10px]">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    {c.status !== 'hidden' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-amber-600 hover:bg-amber-500/10 dark:text-amber-300"
                        disabled={hideMut.isPending}
                        onClick={() => hideMut.mutate(c._id)}
                      >
                        Hide
                      </Button>
                    ) : (
                      <span className="text-[10px] text-slate-500">Hidden</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 text-[11px] text-slate-500">
        <MessageSquare className="h-3.5 w-3.5" />
        Bulk actions and search can be added in a follow-up.
      </p>
    </div>
  );
}
