'use client';

import { useEffect } from 'react';

import {
  clearFirebaseAuth,
  ensureFirebaseAuth,
} from '@/lib/firebase-auth';
import { useAuthStore } from '@/store/authStore';

/**
 * Keeps Firebase Auth signed in with the Mongo user id so RTDB chat rules work.
 */
export function FirebaseAuthBridge() {
  const userId = useAuthStore((s) => s.user?._id);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!userId || !accessToken) {
      void clearFirebaseAuth();
      return;
    }
    void ensureFirebaseAuth(userId).catch((err) => {
      console.warn('[FirebaseAuthBridge] sign-in failed', err);
    });
  }, [hasHydrated, userId, accessToken]);

  return null;
}
