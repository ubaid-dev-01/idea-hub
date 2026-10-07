'use client';

import { useQueryClient } from '@tanstack/react-query';
import axios, { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { authApi } from '@/lib/api/auth.api';
import { getApiError } from '@/lib/api/axios';
import { clearFirebaseAuth } from '@/lib/firebase-auth';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const store = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const login = async (email: string, password: string) => {
    try {
      const { user, tokens } = await authApi.login({ email, password });
      store.setAuth(user, tokens);
      await queryClient.invalidateQueries();
      toast.success(`Welcome back, ${user.fullName.split(' ')[0] ?? user.username}!`);
      if (user.role === 'super_admin' || user.role === 'moderator') {
        router.push('/admin/dashboard');
      } else {
        router.push('/feed');
      }
    } catch (err) {
      const msg = getApiError(err);
      toast.error(msg);
      throw err;
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }) => {
    try {
      const { user, tokens } = await authApi.register(data);
      store.setAuth(user, tokens);
      await queryClient.invalidateQueries();
      toast.success(`Welcome to Ideas Hub, ${user.fullName}!`);
      router.push('/feed');
    } catch (err) {
      const msg = getApiError(err);
      toast.error(msg);
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (store.refreshToken) {
        await authApi.logout(store.refreshToken);
      }
    } catch {
      /* ignore */
    } finally {
      await clearFirebaseAuth();
      store.logout();
      queryClient.clear();
      router.push('/login');
    }
  };

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: !store.hasHydrated,
    login,
    logout,
    register,
  };
}

export { isAxiosError, axios };
