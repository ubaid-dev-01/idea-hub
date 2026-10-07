import type {
  ApiResponse,
  ILiveRoom,
  ILiveRoomMessage,
  ILiveRoomQuestion,
} from '@/types/api';

import api from './axios';

export const liveRoomsApi = {
  listLiveNow: async () => {
    const res = await api.get<ApiResponse<ILiveRoom[]>>('/live-rooms/live-now');
    if (!res.data.success) {
      throw new Error(res.data.message || 'Live rooms unavailable');
    }
    return res.data.data ?? [];
  },

  list: async (params?: { status?: string; cursor?: string }) => {
    const res = await api.get<ApiResponse<ILiveRoom[]>>('/live-rooms', {
      params,
    });
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to list rooms');
    }
    return {
      rooms: res.data.data ?? [],
      meta: res.data.meta,
    };
  },

  get: async (id: string) => {
    const res = await api.get<ApiResponse<ILiveRoom>>(`/live-rooms/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Room not found');
    }
    return res.data.data;
  },

  create: async (body: {
    title: string;
    description?: string;
    category?: string;
    tags?: string[];
    ideaId?: string | null;
    scheduledFor?: string;
  }) => {
    const res = await api.post<ApiResponse<ILiveRoom>>('/live-rooms', body);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Create failed');
    }
    return res.data.data;
  },

  rsvp: async (id: string) => {
    const res = await api.post<ApiResponse<{ rsvped: boolean }>>(
      `/live-rooms/${id}/rsvp`
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'RSVP failed');
    }
    return res.data.data;
  },

  cancelRsvp: async (id: string) => {
    const res = await api.delete<ApiResponse<{ rsvped: boolean }>>(
      `/live-rooms/${id}/rsvp`
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Failed to remove RSVP');
    }
    return res.data.data;
  },

  goLive: async (id: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/go-live`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Go live failed');
    }
    return res.data.data;
  },

  end: async (id: string, recordingUrl?: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/end`,
      { recordingUrl: recordingUrl ?? '' }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'End room failed');
    }
    return res.data.data;
  },

  token: async (id: string) => {
    const res = await api.post<
      ApiResponse<{
        token: string;
        joinUrl: string;
        provider: string;
        roomName: string;
      }>
    >(`/live-rooms/${id}/token`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Token failed');
    }
    return res.data.data;
  },

  join: async (id: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/join`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Join failed');
    }
    return res.data.data;
  },

  leave: async (id: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/leave`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Leave failed');
    }
    return res.data.data;
  },

  raiseHand: async (id: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/raise-hand`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Raise hand failed');
    }
    return res.data.data;
  },

  approveSpeaker: async (id: string, userId: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/approve-speaker`,
      { userId }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Approve failed');
    }
    return res.data.data;
  },

  demoteSpeaker: async (id: string, userId: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/demote-speaker`,
      { userId }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Demote failed');
    }
    return res.data.data;
  },

  messages: async (id: string, cursor?: string) => {
    const res = await api.get<ApiResponse<ILiveRoomMessage[]>>(
      `/live-rooms/${id}/messages`,
      { params: { cursor } }
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Messages failed');
    }
    return {
      messages: res.data.data ?? [],
      meta: res.data.meta,
    };
  },

  sendMessage: async (id: string, body: string) => {
    const res = await api.post<ApiResponse<ILiveRoomMessage>>(
      `/live-rooms/${id}/messages`,
      { body }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Send failed');
    }
    return res.data.data;
  },

  questions: async (id: string) => {
    const res = await api.get<ApiResponse<ILiveRoomQuestion[]>>(
      `/live-rooms/${id}/questions`
    );
    if (!res.data.success) {
      throw new Error(res.data.message || 'Questions failed');
    }
    return res.data.data ?? [];
  },

  askQuestion: async (id: string, body: string) => {
    const res = await api.post<ApiResponse<ILiveRoomQuestion>>(
      `/live-rooms/${id}/questions`,
      { body }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Question failed');
    }
    return res.data.data;
  },

  answerQuestion: async (id: string, qId: string) => {
    const res = await api.post<ApiResponse<{ _id: string; status: string }>>(
      `/live-rooms/${id}/questions/${qId}/answer`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Update failed');
    }
    return res.data.data;
  },

  dismissQuestion: async (id: string, qId: string) => {
    const res = await api.post<ApiResponse<{ _id: string; status: string }>>(
      `/live-rooms/${id}/questions/${qId}/dismiss`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Dismiss failed');
    }
    return res.data.data;
  },

  setPoll: async (id: string, question: string, options: string[]) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(`/live-rooms/${id}/poll`, {
      question,
      options,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Poll failed');
    }
    return res.data.data;
  },

  votePoll: async (id: string, optionIndex: number) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/poll/vote`,
      { optionIndex }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Vote failed');
    }
    return res.data.data;
  },

  closePoll: async (id: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/poll/close`
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Close poll failed');
    }
    return res.data.data;
  },

  validationVote: async (id: string, score: number) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/validation-vote`,
      { score }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Vote failed');
    }
    return res.data.data;
  },

  react: async (id: string, emoji: string) => {
    const res = await api.post<ApiResponse<ILiveRoom>>(
      `/live-rooms/${id}/reactions`,
      { emoji }
    );
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message || 'Reaction failed');
    }
    return res.data.data;
  },
};
