'use client';

import { useTheme } from 'next-themes';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AdminTheme = 'dark' | 'light';

const STORAGE_KEY = 'ideahub-admin-theme';

function readStoredTheme(): AdminTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function systemTheme(): AdminTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

type Ctx = {
  theme: AdminTheme;
  setTheme: (t: AdminTheme) => void;
  toggleTheme: () => void;
  isLight: boolean;
};

const AdminThemeContext = createContext<Ctx | null>(null);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const { setTheme: setNextTheme } = useTheme();
  const [theme, setThemeState] = useState<AdminTheme>('dark');
  const [hydrated, setHydrated] = useState(false);

  /**
   * Admin UI mixes explicit `isLight` classes with `dark:` Tailwind variants.
   * `dark:` follows `<html class="dark">` from next-themes — if we only flip React
   * state, light mode looks broken (e.g. `text-slate-900 dark:text-white` stays white).
   * Keep the document class in sync when the user sets an admin preference.
   */
  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setThemeState(stored);
      setNextTheme(stored);
    } else {
      const rootIsDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');
      setThemeState(rootIsDark ? 'dark' : 'light');
    }
    setHydrated(true);
  }, [setNextTheme]);

  useEffect(() => {
    if (!hydrated) return;
    const onSchemeChange = () => {
      if (readStoredTheme()) return;
      const next = systemTheme();
      setThemeState(next);
      setNextTheme(next);
    };
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', onSchemeChange);
    return () => mq.removeEventListener('change', onSchemeChange);
  }, [hydrated, setNextTheme]);

  const setTheme = useCallback(
    (t: AdminTheme) => {
      setThemeState(t);
      setNextTheme(t);
      try {
        localStorage.setItem(STORAGE_KEY, t);
      } catch {
        /* ignore */
      }
    },
    [setNextTheme]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: AdminTheme = prev === 'dark' ? 'light' : 'dark';
      setNextTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [setNextTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isLight: theme === 'light',
    }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <AdminThemeContext.Provider value={value}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): Ctx {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    throw new Error('useAdminTheme must be used inside AdminThemeProvider');
  }
  return ctx;
}
