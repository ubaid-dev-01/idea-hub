import axios, {
  AxiosError,
  AxiosHeaders,
  isAxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import { useAuthStore } from '@/store/authStore';

const baseURL = `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? ''}/api`;

const api = axios.create({
  baseURL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Axios v1 uses AxiosHeaders; assigning `config.headers.Authorization` may not send the header. */
function setAuthorizationHeader(
  config: InternalAxiosRequestConfig,
  value: string | null
): void {
  const headers = AxiosHeaders.from(config.headers ?? {});
  if (value === null) {
    headers.delete('Authorization');
  } else {
    headers.set('Authorization', value);
  }
  config.headers = headers;
}

function waitForAuthHydration(timeoutMs = 5_000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (useAuthStore.getState().hasHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const start = Date.now();
    const unsub = useAuthStore.subscribe((s) => {
      if (s.hasHydrated || Date.now() - start > timeoutMs) {
        unsub();
        resolve();
      }
    });
    window.setTimeout(() => {
      try {
        unsub();
      } catch {
        /* noop */
      }
      // Ensure flag is set so callers don't hang forever if persist never fires.
      if (!useAuthStore.getState().hasHydrated) {
        useAuthStore.getState().setHasHydrated(true);
      }
      resolve();
    }, timeoutMs);
  });
}

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      await waitForAuthHydration();
    }
    const path = config.url ?? '';
    const isPublicAuth =
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/forgot-password') ||
      path.includes('/auth/reset-password') ||
      path.includes('/auth/refresh');
    const token = useAuthStore.getState().accessToken;
    if (token && !isPublicAuth) {
      setAuthorizationHeader(config, `Bearer ${token}`);
    } else if (isPublicAuth) {
      setAuthorizationHeader(config, null);
    }
    if (config.data instanceof FormData) {
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.delete('Content-Type');
      headers.delete('content-type');
      config.headers = headers;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (v: string) => void;
  reject: (e: unknown) => void;
}> = [];

function processQueue(error: unknown, token?: string) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const urlPath = original?.url ?? '';
    const skipRefresh =
      urlPath.includes('/auth/refresh') ||
      urlPath.includes('/auth/login') ||
      urlPath.includes('/auth/register');

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !skipRefresh
    ) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          setAuthorizationHeader(original, `Bearer ${token}`);
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await waitForAuthHydration();
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        const { data } = await axios.post<{
          success: boolean;
          data: { tokens: { accessToken: string; refreshToken: string } };
        }>(`${baseURL}/auth/refresh`, { refreshToken });

        const tokens = data.data?.tokens;
        if (!tokens?.accessToken) {
          throw new Error('Invalid refresh response');
        }
        useAuthStore.getState().setTokens({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? refreshToken,
        });
        processQueue(null, tokens.accessToken);
        setAuthorizationHeader(original, `Bearer ${tokens.accessToken}`);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        const networkOnly =
          isAxiosError(refreshError) && !refreshError.response;
        // Keep session on transient network errors; clear only on real auth failure.
        if (
          !networkOnly &&
          useAuthStore.getState().hasHydrated
        ) {
          useAuthStore.getState().logout();
          if (typeof window !== 'undefined') {
            const path = window.location.pathname;
            if (!path.startsWith('/login') && !path.startsWith('/register')) {
              window.location.assign('/login');
            }
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }
    if (Array.isArray(data?.errors) && data.errors[0]) {
      return String(data.errors[0]);
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

export { isAxiosError };
export default api;
