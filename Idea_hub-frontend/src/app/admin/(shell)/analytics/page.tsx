'use client';

import { BarChart3 } from 'lucide-react';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { cn } from '@/components/ui/cn';

export default function AdminAnalyticsPage() {
  const { isLight } = useAdminTheme();
  return (
    <div className="space-y-4">
      <h1
        className={cn(
          'text-xl font-bold md:text-2xl',
          isLight ? 'text-slate-900' : 'text-white'
        )}
      >
        Analytics
      </h1>
      <div
        className={cn(
          'flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center',
          isLight ? 'border-slate-200 bg-white' : 'border-cyan-500/15 bg-[#242526]'
        )}
      >
        <BarChart3
          className={cn('h-12 w-12', isLight ? 'text-slate-300' : 'text-cyan-500/40')}
        />
        <p className={cn('max-w-md text-sm', isLight ? 'text-slate-600' : 'text-slate-400')}>
          Deeper funnel and cohort analytics will appear here. The overview dashboard already
          shows live KPIs, weekly activity, and category mix from the API.
        </p>
      </div>
    </div>
  );
}
