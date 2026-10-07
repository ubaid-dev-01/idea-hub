'use client';

import { Moon, Sun } from 'lucide-react';

import { cn } from '@/components/ui/cn';
import { useLandingTheme } from '@/hooks/useLandingTheme';

export function LandingThemeToggle({ className }: { className?: string }) {
  const { toggle, mounted, isDark } = useLandingTheme();

  return (
    <button
      type="button"
      onClick={() => toggle()}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {!mounted ? (
        <span className="h-5 w-5 rounded-full bg-slate-300/50 dark:bg-slate-600/50" />
      ) : isDark ? (
        <Sun className="h-5 w-5" aria-hidden />
      ) : (
        <Moon className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}
