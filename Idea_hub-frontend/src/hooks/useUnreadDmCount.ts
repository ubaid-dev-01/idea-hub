'use client';

import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

import { tryGetFirebaseDb } from '@/lib/firebase.client';
import { ensureFirebaseAuth } from '@/lib/firebase-auth';
import type { ChatThreadRow } from '@/lib/chat';
import { useAuthStore } from '@/store/authStore';

/** Total unread DMs and group chats (sum of per-thread unread counts). */
export function useUnreadDmCount(): number {
  const me = useAuthStore((s) => s.user);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!me?._id) {
      setTotal(0);
      return;
    }
    const db = tryGetFirebaseDb();
    if (!db) return;

    let unsub: (() => void) | undefined;
    void ensureFirebaseAuth(me._id).then(() => {
      const r = ref(db, `userChats/${me._id}`);
      unsub = onValue(r, (snap) => {
        const v = (snap.val() ?? {}) as Record<string, ChatThreadRow>;
        let sum = 0;
        for (const row of Object.values(v)) {
          if (!row) continue;
          sum += Number(row.unreadCount ?? 0);
        }
        setTotal(sum);
      });
    });
    return () => unsub?.();
  }, [me?._id]);

  return total;
}
