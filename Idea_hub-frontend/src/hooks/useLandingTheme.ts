'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useState } from 'react';

/**
 * Landing / marketing theme helpers. Persistence is handled by next-themes
 * (`storageKey: ideahub-theme` in ThemeProvider).
 */
export function useLandingTheme() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    const next =
      resolvedTheme === 'dark'
        ? 'light'
        : resolvedTheme === 'light'
          ? 'dark'
          : systemTheme === 'dark'
            ? 'light'
            : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-transition');
      window.setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 400);
    }
    setTheme(next);
  }, [resolvedTheme, setTheme, systemTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggle,
    mounted,
    isDark: resolvedTheme === 'dark',
  };
}
