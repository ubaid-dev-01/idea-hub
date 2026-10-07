import type { ApiResponse } from '@/types/api';

import api from './axios';

export type BehaviorEventType =
  | 'view'
  | 'like'
  | 'share'
  | 'comment'
  | 'save'
  | 'collab_request'
  | 'search'
  | 'click'
  | 'scroll_depth';

export type BehaviorSource =
  | 'feed'
  | 'search'
  | 'profile'
  | 'notification'
  | 'trending';

export const behaviorApi = {
  record: async (payload: {
    eventType: BehaviorEventType;
    ideaId?: string | null;
    sessionId: string;
    source: BehaviorSource;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    durationMs?: number;
    scrollPercent?: number;
  }) => {
    const res = await api.post<ApiResponse<null>>('/behavior', {
      deviceType: 'desktop',
      ...payload,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to record behavior');
    }
  },
};

/** Stable per-tab session id for behavior + view dedup hints */
export function behaviorSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  const key = 'ideahub_behavior_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}
