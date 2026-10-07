import type { ApiResponse } from '@/types/api';

import api, { getApiError } from './axios';

export const subscriptionsApi = {
  /** Public: whether the API has Stripe keys (checkout/portal work). */
  getStatus: async () => {
    const res = await api.get<
      ApiResponse<{ stripeConfigured: boolean }>
    >('/subscriptions/status');
    if (!res.data.success || res.data.data == null) {
      throw new Error(res.data.message || 'Could not load billing status');
    }
    return res.data.data;
  },

  createCheckout: async (input: {
    plan: 'pro' | 'investor';
    interval: 'month' | 'year';
  }) => {
    try {
      const res = await api.post<ApiResponse<{ url: string }>>(
        '/subscriptions/checkout',
        input
      );
      if (!res.data.success || !res.data.data?.url) {
        throw new Error(res.data.message || 'Checkout failed');
      }
      return res.data.data.url;
    } catch (e) {
      throw new Error(getApiError(e));
    }
  },

  getBillingPortalUrl: async () => {
    try {
      const res = await api.get<ApiResponse<{ url: string }>>(
        '/subscriptions/portal'
      );
      if (!res.data.success || !res.data.data?.url) {
        throw new Error(res.data.message || 'Could not open billing portal');
      }
      return res.data.data.url;
    } catch (e) {
      throw new Error(getApiError(e));
    }
  },

  /** After Checkout: sync Stripe → Mongo (webhook fallback). */
  sync: async () => {
    try {
      const res = await api.post<
        ApiResponse<{
          synced: boolean;
          reason?: string;
          plan: string;
          status: string;
          subscription: unknown;
        }>
      >('/subscriptions/sync');
      if (!res.data.success || res.data.data == null) {
        throw new Error(res.data.message || 'Sync failed');
      }
      return res.data.data;
    } catch (e) {
      throw new Error(getApiError(e));
    }
  },
};
