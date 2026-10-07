import type { ApiResponse } from '@/types/api';

import api from './axios';

export type IdeaCollectionDto = {
  _id: string;
  ownerId: string;
  name: string;
  description: string;
  slug: string;
  isPublic: boolean;
  followerCount: number;
  ideaCount: number;
  following?: boolean;
  createdAt: string;
  updatedAt: string;
};

export const collectionsApi = {
  listByUsername: async (username: string) => {
    const res = await api.get<ApiResponse<IdeaCollectionDto[]>>(
      `/collections/by-user/${encodeURIComponent(username)}`
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load collections');
    }
    return res.data.data ?? [];
  },
};
