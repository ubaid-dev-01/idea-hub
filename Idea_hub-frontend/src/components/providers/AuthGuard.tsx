'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';

export function AuthGuard({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Array<'user' | 'collaborator' | 'moderator' | 'super_admin'>;
}) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Wait for localStorage rehydrate — otherwise reload looks like a logout.
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (roles?.length && user && !roles.includes(user.role)) {
      router.replace('/feed');
    }
  }, [hasHydrated, isAuthenticated, roles, router, user]);

  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (roles?.length && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-muted)]">
        Access denied
      </div>
    );
  }

  return <>{children}</>;
}
