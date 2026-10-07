import type {
  AdminDashboardStats,
  AdminIdeaParams,
  AdminUserParams,
  ApiResponse,
  AuditLogParams,
  IIdea,
  IAdminAuditLog,
  IAdminComment,
  IUser,
  ScanQueueIdea,
} from '@/types/api';

import api from './axios';

export const adminApi = {
  patchMe: async (body: {
    fullName?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    const res = await api.patch<ApiResponse<IUser>>('/admin/me', body);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  createSuperAdmin: async (body: {
    email: string;
    username: string;
    fullName: string;
    password: string;
  }) => {
    const res = await api.post<ApiResponse<IUser>>('/admin/super-admins', body);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Create failed');
    }
    return res.data.data;
  },

  getStats: async () => {
    const res = await api.get<ApiResponse<AdminDashboardStats>>(
      '/admin/dashboard/stats'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load stats');
    }
    return res.data.data;
  },

  getUsers: async (params: AdminUserParams) => {
    const res = await api.get<ApiResponse<IUser[]>>('/admin/users', {
      params,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load users');
    }
    return { users: res.data.data ?? [], meta: res.data.meta };
  },

  updateUser: async (id: string, body: { fullName?: string; bio?: string }) => {
    const res = await api.patch<ApiResponse<IUser>>(`/admin/users/${id}`, body);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  updateUserStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch<ApiResponse<IUser>>(
      `/admin/users/${id}/status`,
      { status, reason: reason ?? '' }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Status update failed');
    }
    return res.data.data;
  },

  updateUserRole: async (id: string, role: string) => {
    const res = await api.patch<ApiResponse<IUser>>(`/admin/users/${id}/role`, {
      role,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Role update failed');
    }
    return res.data.data;
  },

  deleteUser: async (id: string) => {
    const res = await api.delete<ApiResponse<unknown>>(`/admin/users/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.message || 'Delete failed');
    }
  },

  getIdeas: async (params: AdminIdeaParams) => {
    const res = await api.get<ApiResponse<IIdea[]>>('/admin/ideas', {
      params,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load ideas');
    }
    return { ideas: res.data.data ?? [], meta: res.data.meta };
  },

  setIdeaFeatured: async (id: string, featured: boolean) => {
    const res = await api.patch<ApiResponse<IIdea>>(
      `/admin/ideas/${id}/featured`,
      { featured }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  getComments: async (params: { cursor?: string; status?: string }) => {
    const res = await api.get<ApiResponse<IAdminComment[]>>('/admin/comments', {
      params,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load comments');
    }
    return { comments: res.data.data ?? [], meta: res.data.meta };
  },

  updateCommentStatus: async (id: string, status: string) => {
    const res = await api.patch<ApiResponse<IAdminComment>>(
      `/admin/comments/${id}/status`,
      { status }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  updateIdeaStatus: async (id: string, status: string, reason?: string) => {
    const res = await api.patch<ApiResponse<IIdea>>(
      `/admin/ideas/${id}/status`,
      { status, reason }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Idea update failed');
    }
    return res.data.data;
  },

  deleteIdea: async (id: string) => {
    const res = await api.delete<ApiResponse<unknown>>(`/admin/ideas/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.message || 'Delete failed');
    }
  },

  getScanQueue: async () => {
    const res = await api.get<ApiResponse<ScanQueueIdea[]>>(
      '/admin/scan-queue'
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load scan queue');
    }
    return res.data.data ?? [];
  },

  decideScanItem: async (
    id: string,
    approved: boolean,
    reason?: string
  ) => {
    await api.post<ApiResponse<unknown>>(
      `/admin/scan-queue/${id}/decision`,
      { approved, reason }
    );
  },

  getAuditLogs: async (params: AuditLogParams) => {
    const res = await api.get<ApiResponse<IAdminAuditLog[]>>(
      '/admin/audit-logs',
      { params }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load audit logs');
    }
    return { logs: res.data.data ?? [], meta: res.data.meta };
  },

  broadcastNotification: async (title: string, body: string) => {
    await api.post<ApiResponse<unknown>>(
      '/admin/notifications/broadcast',
      { title, body }
    );
  },
};
