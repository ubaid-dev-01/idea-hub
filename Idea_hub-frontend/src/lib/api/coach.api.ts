import type { ApiResponse, IDailyBriefPayload, IIdea } from '@/types/api';

import api from './axios';

export const coachApi = {
  dailyBrief: async () => {
    const res = await api.get<
      ApiResponse<{
        brief: IDailyBriefPayload | null;
        dismissed: boolean;
      }>
    >('/coach/daily-brief');
    if (!res.data.success) {
      throw new Error(res.data.message || 'Brief unavailable');
    }
    return res.data.data;
  },

  dismissBrief: async () => {
    const res = await api.post<ApiResponse<{ dismissed: boolean }>>(
      '/coach/daily-brief/dismiss'
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Dismiss failed');
    }
    return res.data.data;
  },

  usage: async () => {
    const res = await api.get<
      ApiResponse<{
        messagesUsedToday: number;
        limit: number;
        unlimited: boolean;
      }>
    >('/coach/usage');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Usage failed');
    }
    return res.data.data;
  },

  chat: async (message: string, ideaId?: string) => {
    const res = await api.post<
      ApiResponse<{
        reply: string;
        messagesUsedToday: number;
        limit: number;
      }>
    >('/coach/chat', { message, ideaId });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Chat failed');
    }
    return res.data.data;
  },

  opening: async () => {
    const res = await api.get<
      ApiResponse<{ ideaCount: number; openingMessage: string }>
    >('/coach/opening');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed');
    }
    return res.data.data;
  },

  refreshIdeaFeedback: async (ideaId: string) => {
    const res = await api.post<ApiResponse<{ idea: IIdea }>>(
      `/coach/ideas/${ideaId}/feedback/refresh`
    );
    if (!res.data.success || !res.data.data?.idea) {
      throw new Error(res.data.message || 'Refresh failed');
    }
    return res.data.data.idea;
  },
};
