import type { ApiResponse } from '@/types/api';

import api, { getApiError } from './axios';

export type StoryAuthor = {
  _id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
};

export type StoryDto = {
  _id: string;
  authorId: StoryAuthor | string;
  mediaUrl: string;
  thumbnailUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  expiresAt: string;
  createdAt: string;
};

export const storiesApi = {
  list: async () => {
    try {
      const res = await api.get<ApiResponse<{ stories: StoryDto[] }>>(
        '/stories'
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.message || 'Failed to load stories');
      }
      return res.data.data.stories;
    } catch (e) {
      throw new Error(getApiError(e));
    }
  },

  create: async (input: {
    mediaUrl: string;
    thumbnailUrl?: string;
    mediaType: 'image' | 'video';
    caption?: string;
  }) => {
    try {
      const res = await api.post<ApiResponse<{ story: StoryDto }>>(
        '/stories',
        input
      );
      if (!res.data.success || !res.data.data?.story) {
        throw new Error(res.data.message || 'Failed to post story');
      }
      return res.data.data.story;
    } catch (e) {
      throw new Error(getApiError(e));
    }
  },

  remove: async (id: string) => {
    try {
      const res = await api.delete<ApiResponse<null>>(`/stories/${id}`);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to remove story');
      }
    } catch (e) {
      throw new Error(getApiError(e));
    }
  },
};
