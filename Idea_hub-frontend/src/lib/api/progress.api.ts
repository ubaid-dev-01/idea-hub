import type {
  ApiResponse,
  IBadgeDefinition,
  ILeaderboardPayload,
  IUserProgress,
} from '@/types/api';

import api from './axios';

export const progressApi = {
  getMe: async (): Promise<IUserProgress> => {
    const res = await api.get<ApiResponse<IUserProgress>>('/progress/me');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load progress');
    }
    return res.data.data;
  },

  getBadgesCatalog: async (): Promise<IBadgeDefinition[]> => {
    const res = await api.get<ApiResponse<IBadgeDefinition[]>>(
      '/progress/badges'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load badges');
    }
    return res.data.data;
  },

  getLeaderboard: async (params: {
    scope: 'global' | 'following' | 'category';
    category?: string;
  }): Promise<ILeaderboardPayload> => {
    const res = await api.get<ApiResponse<ILeaderboardPayload>>(
      '/progress/leaderboard',
      {
        params: {
          scope: params.scope,
          ...(params.category ? { category: params.category } : {}),
        },
      }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load leaderboard');
    }
    return res.data.data;
  },

  recordValidationVote: async (): Promise<IUserProgress | null> => {
    const res = await api.post<ApiResponse<IUserProgress | null>>(
      '/progress/validation-vote'
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to record vote');
    }
    return res.data.data ?? null;
  },
};
