import type { ApiResponse, INotification } from '@/types/api';

import api from './axios';

export const notificationsApi = {
  getAll: async (cursor?: string, unreadOnly?: boolean) => {
    const res = await api.get<ApiResponse<INotification[]>>(
      '/users/me/notifications',
      { params: { cursor, unreadOnly } }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load notifications');
    }
    return {
      notifications: res.data.data ?? [],
      meta: res.data.meta,
    };
  },

  markRead: async (id: string) => {
    await api.patch<ApiResponse<unknown>>(
      `/users/me/notifications/${id}/read`
    );
  },

  markAllRead: async () => {
    await api.patch<ApiResponse<unknown>>(
      '/users/me/notifications/read-all'
    );
  },
};
