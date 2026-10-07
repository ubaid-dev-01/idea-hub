'use client';

import { Bell } from 'lucide-react';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { cn } from '@/components/ui/cn';

export default function AdminBroadcastsPage() {
  const { isLight } = useAdminTheme();
  return (
    <div className="space-y-4">
      <h1
        className={cn(
          'text-xl font-bold md:text-2xl',
          isLight ? 'text-slate-900' : 'text-white'
        )}
      >
        Broadcasts
      </h1>
      <div
        className={cn(
          'flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center',
          isLight ? 'border-slate-200 bg-white' : 'border-cyan-500/15 bg-[#242526]'
        )}
      >
        <Bell
          className={cn('h-12 w-12', isLight ? 'text-slate-300' : 'text-cyan-500/40')}
        />
        <p className={cn('max-w-md text-sm', isLight ? 'text-slate-600' : 'text-slate-400')}>
          Admin broadcast messaging to all users is not wired yet. Use this section once a
          backend endpoint is added for targeted announcements.
        </p>
      </div>
    </div>
  );
}
