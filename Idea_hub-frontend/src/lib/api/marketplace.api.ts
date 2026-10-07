import type {
  ApiResponse,
  IMarketplaceEarnings,
  IMarketplaceListing,
} from '@/types/api';

import api from './axios';

export type MarketplaceBrowseParams = {
  cursor?: string;
  listingType?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  validationMin?: number;
};

export const marketplaceApi = {
  browse: async (params: MarketplaceBrowseParams) => {
    const clean = Object.fromEntries(
      Object.entries({
        cursor: params.cursor,
        listingType: params.listingType,
        category: params.category,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        validationMin: params.validationMin,
      }).filter(
        ([, v]) => v !== undefined && v !== ''
      )
    );
    const res = await api.get<ApiResponse<IMarketplaceListing[]>>(
      '/marketplace/listings',
      { params: clean }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load marketplace');
    }
    return {
      listings: res.data.data,
      meta: res.data.meta,
    };
  },

  featured: async () => {
    const res = await api.get<ApiResponse<IMarketplaceListing[]>>(
      '/marketplace/listings/featured'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load featured');
    }
    return res.data.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<IMarketplaceListing>>(
      `/marketplace/listings/${id}`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Listing not found');
    }
    return res.data.data;
  },

  myListings: async () => {
    const res = await api.get<ApiResponse<IMarketplaceListing[]>>(
      '/marketplace/listings/my'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load your listings');
    }
    return res.data.data;
  },

  createListing: async (body: {
    ideaId: string;
    listingType: string;
    description: string;
    targetBuyer?: string;
    proofPoints?: string[];
    askingPrice?: number;
    equity?: number;
    status?: 'draft' | 'active';
  }) => {
    const res = await api.post<ApiResponse<IMarketplaceListing>>(
      '/marketplace/listings',
      body
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Create failed');
    }
    return res.data.data;
  },

  updateListingStatus: async (
    id: string,
    status: 'active' | 'withdrawn' | 'draft'
  ) => {
    const res = await api.patch<ApiResponse<IMarketplaceListing>>(
      `/marketplace/listings/${id}`,
      { status }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  submitBid: async (listingId: string, amount: number, message: string) => {
    const res = await api.post<ApiResponse<IMarketplaceListing>>(
      `/marketplace/listings/${listingId}/bid`,
      { amount, message }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Bid failed');
    }
    return res.data.data;
  },

  respondToBid: async (
    listingId: string,
    bidId: string,
    action: 'accept' | 'reject'
  ) => {
    const res = await api.patch<ApiResponse<IMarketplaceListing>>(
      `/marketplace/listings/${listingId}/bids/${bidId}`,
      { action }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Action failed');
    }
    return res.data.data;
  },

  expressInterest: async (listingId: string) => {
    const res = await api.post<ApiResponse<IMarketplaceListing>>(
      `/marketplace/listings/${listingId}/interest`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed');
    }
    return res.data.data;
  },

  earnings: async () => {
    const res = await api.get<ApiResponse<IMarketplaceEarnings>>(
      '/marketplace/seller/earnings'
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load earnings');
    }
    return res.data.data;
  },

  payoutConnect: async () => {
    const res = await api.post<
      ApiResponse<{ onboardingUrl: string | null; dashboardUrl: string | null }>
    >('/marketplace/seller/payout/connect');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed');
    }
    return res.data.data;
  },
};
