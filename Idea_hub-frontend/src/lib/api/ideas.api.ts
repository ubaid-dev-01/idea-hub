import type {
  ApiResponse,
  CollabRequestDto,
  CreateIdeaPayload,
  ICollabRequest,
  IComment,
  IIdea,
  IIdeaValidationScore,
  SearchParams,
  UpdateIdeaDto,
} from '@/types/api';

import api from './axios';

export type TrendingTagRow = { tag: string; score: number };

export const ideasApi = {
  getTrendingTags: async () => {
    const res = await api.get<
      ApiResponse<{ tags: TrendingTagRow[]; updatedAt: string | null }>
    >('/ideas/trending-tags');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load trending tags');
    }
    return res.data.data;
  },

  getFeed: async (cursor?: string, tag?: string) => {
    const res = await api.get<ApiResponse<IIdea[]>>('/ideas', {
      params: { cursor, ...(tag ? { tag } : {}) },
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load feed');
    }
    return {
      ideas: res.data.data ?? [],
      meta: res.data.meta,
    };
  },

  getTrending: async () => {
    const res = await api.get<ApiResponse<IIdea[]>>('/ideas/trending');
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load trending');
    }
    return res.data.data ?? [];
  },

  search: async (params: SearchParams) => {
    const res = await api.get<ApiResponse<IIdea[]>>('/ideas/search', {
      params,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Search failed');
    }
    return {
      ideas: res.data.data ?? [],
      meta: res.data.meta,
    };
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<IIdea>>(`/ideas/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Idea not found');
    }
    return res.data.data;
  },

  recalculateValidation: async (id: string) => {
    const res = await api.post<
      ApiResponse<{ validationScore: IIdeaValidationScore; idea: IIdea }>
    >(`/ideas/${id}/validation/recalculate`);
    if (!res.data.success || !res.data.data?.idea) {
      throw new Error(res.data.message || 'Recalculate failed');
    }
    return res.data.data.idea;
  },

  create: async (payload: CreateIdeaPayload) => {
    const res = await api.post<ApiResponse<IIdea>>('/ideas', payload);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Create failed');
    }
    return res.data.data;
  },

  update: async (id: string, data: UpdateIdeaDto) => {
    const res = await api.patch<ApiResponse<IIdea>>(`/ideas/${id}`, data);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  delete: async (id: string) => {
    await api.delete<ApiResponse<unknown>>(`/ideas/${id}`);
  },

  toggleLike: async (id: string) => {
    const res = await api.post<
      ApiResponse<{ liked: boolean; likeCount: number }>
    >(`/ideas/${id}/like`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Like failed');
    }
    return res.data.data;
  },

  getLikes: async (id: string, cursor?: string) => {
    const res = await api.get<ApiResponse<unknown>>(`/ideas/${id}/likes`, {
      params: { cursor },
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load likes');
    }
    return { data: res.data.data, meta: res.data.meta };
  },

  addMedia: async (id: string, formData: FormData) => {
    const res = await api.post<ApiResponse<IIdea>>(
      `/ideas/${id}/media`,
      formData
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Upload failed');
    }
    return res.data.data;
  },

  deleteMedia: async (id: string, mediaId: string) => {
    await api.delete<ApiResponse<unknown>>(
      `/ideas/${id}/media/${mediaId}`
    );
  },

  getComments: async (id: string, cursor?: string) => {
    const res = await api.get<ApiResponse<IComment[]>>(
      `/ideas/${id}/comments`,
      { params: { cursor } }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load comments');
    }
    return { comments: res.data.data ?? [], meta: res.data.meta };
  },

  addComment: async (
    id: string,
    content: string,
    parentCommentId?: string
  ) => {
    const res = await api.post<ApiResponse<IComment>>(
      `/ideas/${id}/comments`,
      { content, parentCommentId }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Comment failed');
    }
    return res.data.data;
  },

  updateComment: async (
    ideaId: string,
    commentId: string,
    content: string
  ) => {
    const res = await api.patch<ApiResponse<IComment>>(
      `/ideas/${ideaId}/comments/${commentId}`,
      { content }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  deleteComment: async (ideaId: string, commentId: string) => {
    await api.delete<ApiResponse<unknown>>(
      `/ideas/${ideaId}/comments/${commentId}`
    );
  },

  sendCollabRequest: async (id: string, data: CollabRequestDto) => {
    const res = await api.post<ApiResponse<ICollabRequest>>(
      `/ideas/${id}/collab-request`,
      data
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Request failed');
    }
    return res.data.data;
  },

  getCollabRequests: async (id: string) => {
    const res = await api.get<ApiResponse<ICollabRequest[]>>(
      `/ideas/${id}/collab-requests`
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load requests');
    }
    return res.data.data ?? [];
  },

  respondToCollabRequest: async (
    id: string,
    reqId: string,
    status: 'accepted' | 'rejected',
    responseMessage?: string
  ) => {
    const res = await api.patch<ApiResponse<ICollabRequest>>(
      `/ideas/${id}/collab-requests/${reqId}`,
      { status, responseMessage }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Response failed');
    }
    return res.data.data;
  },

  getIdeaVersions: async (ideaId: string) => {
    const res = await api.get<
      ApiResponse<
        Array<{
          versionNumber: number;
          title: string;
          description: string;
          category: string;
          tags: string[];
          editedBy: string;
          createdAt: string;
        }>
      >
    >(`/ideas/${ideaId}/versions`);
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to load versions');
    }
    return res.data.data ?? [];
  },

  getIdeaVersionDiff: async (
    ideaId: string,
    from: number,
    to: number
  ) => {
    const res = await api.get<
      ApiResponse<{
        fromVersion: number;
        toVersion: number;
        changes: Array<{
          field: string;
          before: unknown;
          after: unknown;
        }>;
      }>
    >(`/ideas/${ideaId}/versions/diff`, { params: { from, to } });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Failed to load diff');
    }
    return res.data.data;
  },

  patchIdeaPoll: async (
    ideaId: string,
    body: { enabled?: boolean; question?: string }
  ) => {
    const res = await api.patch<ApiResponse<IIdea>>(
      `/ideas/${ideaId}/poll`,
      body
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Poll update failed');
    }
    return res.data.data;
  },

  voteIdeaPoll: async (ideaId: string, optionKey: string) => {
    const res = await api.post<ApiResponse<IIdea>>(
      `/ideas/${ideaId}/poll/vote`,
      { optionKey }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Vote failed');
    }
    return res.data.data;
  },

  recordView: async (
    id: string,
    body?: { sessionId?: string; source?: string }
  ) => {
    const res = await api.post<ApiResponse<{ viewCount: number }>>(
      `/ideas/${id}/view`,
      body ?? {}
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'View failed');
    }
    return res.data.data;
  },

  shareIdea: async (
    id: string,
    body?: { sessionId?: string; source?: string }
  ) => {
    const res = await api.post<ApiResponse<IIdea>>(`/ideas/${id}/share`, body ?? {});
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Share failed');
    }
    return res.data.data;
  },
};
