import type {
  ApiResponse,
  IIdea,
  IUser,
  UserCollaborationsPageData,
  UserMeDashboard,
} from '@/types/api';

import api from './axios';

export const usersApi = {
  getMe: async () => {
    const res = await api.get<ApiResponse<IUser>>('/users/me');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load profile');
    }
    return res.data.data;
  },

  getMyDashboard: async () => {
    const res = await api.get<ApiResponse<UserMeDashboard>>(
      '/users/me/dashboard'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load dashboard');
    }
    return res.data.data;
  },

  getMyCollaborations: async () => {
    const res = await api.get<ApiResponse<UserCollaborationsPageData>>(
      '/users/me/collaborations'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load collaborations');
    }
    return res.data.data;
  },

  updateMe: async (payload: {
    fullName: string;
    username: string;
    bio: string;
    skills: string;
    avatarUrl?: string;
  }) => {
    const res = await api.patch<ApiResponse<IUser>>('/users/me', payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  getByUsername: async (username: string) => {
    const res = await api.get<ApiResponse<IUser>>(`/users/${username}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'User not found');
    }
    return res.data.data;
  },

  getUserIdeas: async (userId: string, cursor?: string) => {
    const res = await api.get<ApiResponse<{ ideas: IIdea[] }>>(
      `/users/${userId}/ideas`,
      { params: { cursor } }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load ideas');
    }
    return {
      ideas: res.data.data.ideas ?? [],
      meta: res.data.meta,
    };
  },

  follow: async (userId: string) => {
    await api.post<ApiResponse<unknown>>(`/users/${userId}/follow`);
  },

  unfollow: async (userId: string) => {
    await api.delete<ApiResponse<unknown>>(`/users/${userId}/follow`);
  },

  getFollowers: async (cursor?: string) => {
    const res = await api.get<ApiResponse<IUser[]>>('/users/me/followers', {
      params: { cursor },
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load followers');
    }
    return { users: res.data.data ?? [], meta: res.data.meta };
  },

  getFollowing: async (cursor?: string) => {
    const res = await api.get<ApiResponse<IUser[]>>('/users/me/following', {
      params: { cursor },
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load following');
    }
    return { users: res.data.data ?? [], meta: res.data.meta };
  },

  getFollowersByUsername: async (username: string, cursor?: string) => {
    const res = await api.get<ApiResponse<IUser[]>>(
      `/users/${encodeURIComponent(username)}/followers`,
      { params: { cursor } }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load followers');
    }
    return { users: res.data.data ?? [], meta: res.data.meta };
  },

  getFollowingByUsername: async (username: string, cursor?: string) => {
    const res = await api.get<ApiResponse<IUser[]>>(
      `/users/${encodeURIComponent(username)}/following`,
      { params: { cursor } }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load following');
    }
    return { users: res.data.data ?? [], meta: res.data.meta };
  },

  getSavedIdeas: async (cursor?: string) => {
    const res = await api.get<ApiResponse<IIdea[]>>('/users/me/saved-ideas', {
      params: { cursor },
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load saved ideas');
    }
    return { ideas: res.data.data ?? [], meta: res.data.meta };
  },

  saveIdea: async (ideaId: string) => {
    await api.post<ApiResponse<unknown>>(
      `/users/me/saved-ideas/${ideaId}`
    );
  },

  unsaveIdea: async (ideaId: string) => {
    await api.delete<ApiResponse<unknown>>(
      `/users/me/saved-ideas/${ideaId}`
    );
  },

  requestInnovatorVerification: async (message: string) => {
    const res = await api.post<ApiResponse<IUser>>(
      '/users/me/verification-request',
      { message }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Request failed');
    }
    return res.data.data;
  },
};
