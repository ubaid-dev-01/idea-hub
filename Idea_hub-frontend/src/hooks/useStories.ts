'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { extractApiError } from '@/lib/api/errors';
import { storiesApi } from '@/lib/api/stories.api';

export const STORIES_QUERY_KEY = ['stories'] as const;

export function useStories() {
  return useQuery({
    queryKey: STORIES_QUERY_KEY,
    queryFn: () => storiesApi.list(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
      toast.success('Story posted — disappears in 24 hours');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storiesApi.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: STORIES_QUERY_KEY });
      toast.success('Story removed');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });
}
