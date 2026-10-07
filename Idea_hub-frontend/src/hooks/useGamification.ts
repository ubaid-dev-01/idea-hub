'use client';

import { useQuery } from '@tanstack/react-query';

import { progressApi } from '@/lib/api/progress.api';
import { isGamificationUiEnabled } from '@/lib/gamification';
import { useAuthStore } from '@/store/authStore';

export function useMyProgress() {
  const authed = useAuthStore((s) => Boolean(s.accessToken));
  const enabled = isGamificationUiEnabled() && authed;
  return useQuery({
    queryKey: ['progress', 'me'],
    queryFn: () => progressApi.getMe(),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useBadgesCatalog() {
  const enabled = isGamificationUiEnabled();
  return useQuery({
    queryKey: ['progress', 'badges-catalog'],
    queryFn: () => progressApi.getBadgesCatalog(),
    enabled,
    staleTime: 300_000,
  });
}

export function useLeaderboard(
  scope: 'global' | 'following' | 'category',
  category?: string
) {
  const token = useAuthStore((s) => s.accessToken);
  const enabled =
    isGamificationUiEnabled() &&
    (scope !== 'following' || Boolean(token));
  return useQuery({
    queryKey: ['progress', 'leaderboard', scope, category ?? ''],
    queryFn: () => progressApi.getLeaderboard({ scope, category }),
    enabled,
    staleTime: 60_000,
  });
}
