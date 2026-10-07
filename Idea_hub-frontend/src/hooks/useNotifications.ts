'use client';

import { useQueryClient } from '@tanstack/react-query';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';

import { getFirebaseDb } from '@/lib/firebase.client';
import { notificationsApi } from '@/lib/api/notifications.api';
import { extractApiError } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export function useNotificationListener() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [unreadBump, setUnreadBump] = useState(0);

  useEffect(() => {
    if (!user?._id) return;

    let db: ReturnType<typeof getFirebaseDb>;
    try {
      db = getFirebaseDb();
    } catch {
      return;
    }

    const notifRef = ref(db, `notifications_push/${user._id}/latest`);
    const unsub = onValue(notifRef, (snapshot) => {
      if (!snapshot.exists()) return;
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setUnreadBump((p) => p + 1);
    });

    return () => unsub();
  }, [user?._id, queryClient]);

  return {
    unreadBump: unreadBump,
    resetBump: () => setUnreadBump(0),
  };
}

export function useNotifications(cursor?: string, unreadOnly?: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['notifications', { cursor, unreadOnly }],
    queryFn: () => notificationsApi.getAll(cursor, unreadOnly),
    enabled: Boolean(accessToken),
    staleTime: 15_000,
  });
}

export function useNotificationsInfinite(unreadOnly?: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useInfiniteQuery({
    queryKey: ['notifications', 'infinite', unreadOnly],
    queryFn: ({ pageParam }) =>
      notificationsApi.getAll(pageParam as string | undefined, unreadOnly),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    enabled: Boolean(accessToken),
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err) => toast.error(extractApiError(err)),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All marked read');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });
}
