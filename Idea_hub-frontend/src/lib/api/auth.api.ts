import type {
  ApiResponse,
  AuthTokens,
  IUser,
  LoginDto,
  RegisterDto,
} from '@/types/api';

import api from './axios';

export const authApi = {
  register: async (data: RegisterDto) => {
    const res = await api.post<
      ApiResponse<{ user: IUser; tokens: AuthTokens }>
    >('/auth/register', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Registration failed');
    }
    return res.data.data;
  },

  login: async (data: LoginDto) => {
    const res = await api.post<
      ApiResponse<{ user: IUser; tokens: AuthTokens }>
    >('/auth/login', data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Login failed');
    }
    return res.data.data;
  },

  logout: async (refreshToken: string) => {
    await api.post<ApiResponse<unknown>>('/auth/logout', { refreshToken });
  },

  refresh: async (refreshToken: string) => {
    const res = await api.post<ApiResponse<{ tokens: AuthTokens }>>(
      '/auth/refresh',
      { refreshToken }
    );
    if (!res.data.success || !res.data.data?.tokens) {
      throw new Error(res.data.message || 'Refresh failed');
    }
    return res.data.data;
  },

  verifyEmail: async (token: string) => {
    await api.post<ApiResponse<unknown>>(`/auth/verify-email/${token}`);
  },

  forgotPassword: async (email: string) => {
    await api.post<ApiResponse<unknown>>('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string) => {
    await api.post<ApiResponse<unknown>>(`/auth/reset-password/${token}`, {
      password,
    });
  },
};
