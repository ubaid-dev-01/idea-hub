'use client';

import {
  getAuth,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';

import api from '@/lib/api/axios';
import {
  getFirebaseApp,
  hasFirebaseClientConfig,
} from '@/lib/firebase.client';
import type { ApiResponse } from '@/types/api';

let authSingleton: Auth | null = null;
let syncPromise: Promise<User | null> | null = null;

function getClientAuth(): Auth | null {
  if (!hasFirebaseClientConfig()) return null;
  try {
    authSingleton ??= getAuth(getFirebaseApp());
    return authSingleton;
  } catch {
    return null;
  }
}

/**
 * Ensure Firebase Auth session matches Idea Hub user id (for RTDB rules).
 * Call before chat / RTDB writes.
 */
export async function ensureFirebaseAuth(
  expectedUserId: string
): Promise<User | null> {
  const auth = getClientAuth();
  if (!auth) return null;

  if (auth.currentUser?.uid === expectedUserId) {
    return auth.currentUser;
  }

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      if (auth.currentUser && auth.currentUser.uid !== expectedUserId) {
        await signOut(auth);
      }
      const res = await api.get<ApiResponse<{ token: string }>>(
        '/auth/firebase-token'
      );
      if (!res.data.success || !res.data.data?.token) {
        throw new Error(res.data.message || 'Could not get Firebase token');
      }
      const cred = await signInWithCustomToken(auth, res.data.data.token);
      return cred.user;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export async function clearFirebaseAuth(): Promise<void> {
  const auth = getClientAuth();
  if (!auth?.currentUser) return;
  try {
    await signOut(auth);
  } catch {
    /* ignore */
  }
}

/** Wait until Firebase Auth has finished its first state restore. */
export function waitForFirebaseAuthReady(): Promise<User | null> {
  const auth = getClientAuth();
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}
