'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { extractApiError } from '@/lib/api/errors';
import { ideasApi } from '@/lib/api/ideas.api';
import { useAuthStore } from '@/store/authStore';
import type { CreateIdeaPayload, IIdea, IComment, SearchParams } from '@/types/api';

type FeedPage = { ideas: IIdea[]; meta?: { nextCursor?: string; hasMore?: boolean } };

function findIdeaInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  ideaId: string
): IIdea | undefined {
  const detail = queryClient.getQueryData<IIdea>(['idea', ideaId]);
  if (detail) return detail;
  const feeds = queryClient.getQueriesData({ queryKey: ['feed'] });
  for (const [, data] of feeds) {
    const pages = (data as { pages?: FeedPage[] } | undefined)?.pages;
    if (!pages) continue;
    for (const p of pages) {
      const hit = p.ideas.find((i) => i._id === ideaId);
      if (hit) return hit;
    }
  }
  return undefined;
}

function updateIdeaInFeedCache(
  queryClient: ReturnType<typeof useQueryClient>,
  ideaId: string,
  updater: (i: IIdea) => IIdea
) {
  queryClient.setQueriesData<{
    pages: FeedPage[];
    pageParams: unknown[];
  }>({ queryKey: ['feed'] }, (old) => {
    if (!old?.pages) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        ideas: p.ideas.map((i) => (i._id === ideaId ? updater(i) : i)),
      })),
    };
  });
}

export function useFeed(tag?: string | null) {
  const t = tag?.trim() || undefined;
  return useInfiniteQuery({
    queryKey: ['feed', t ?? ''],
    queryFn: ({ pageParam }) =>
      ideasApi.getFeed(pageParam as string | undefined, t),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useTrendingIdeas() {
  return useQuery({
    queryKey: ['ideas', 'trending'],
    queryFn: () => ideasApi.getTrending(),
    staleTime: 60_000,
  });
}

export function useSearchIdeas(params: SearchParams) {
  return useInfiniteQuery({
    queryKey: ['ideas', 'search', params],
    queryFn: ({ pageParam }) =>
      ideasApi.search({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useIdea(id: string) {
  return useQuery({
    queryKey: ['idea', id],
    queryFn: () => ideasApi.getById(id),
    staleTime: 120_000,
    enabled: Boolean(id),
  });
}

export function useIdeaScanPoll(ideaId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['idea', ideaId],
    queryFn: () => ideasApi.getById(ideaId!),
    enabled: Boolean(ideaId) && enabled,
    staleTime: 0,
    refetchInterval: false,
  });
}

export function useIdeaComments(id: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['idea', id, 'comments'],
    queryFn: ({ pageParam }) =>
      ideasApi.getComments(id, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    enabled: Boolean(id) && enabled,
    staleTime: 20_000,
  });
}

export function useToggleLike(ideaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ideasApi.toggleLike(ideaId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['idea', ideaId] });
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      const prevIdea = queryClient.getQueryData<IIdea>(['idea', ideaId]);
      const prevFeed = queryClient.getQueriesData({
        queryKey: ['feed'],
      });

      const snap = findIdeaInCache(queryClient, ideaId);
      const liked = snap?.liked ?? false;
      const nextLiked = !liked;
      const baseCount = snap?.likeCount ?? 0;
      const nextCount = Math.max(0, baseCount + (nextLiked ? 1 : -1));

      const patch = (i: IIdea): IIdea =>
        i._id !== ideaId
          ? i
          : { ...i, liked: nextLiked, likeCount: nextCount };

      if (prevIdea) {
        queryClient.setQueryData<IIdea>(['idea', ideaId], patch(prevIdea));
      }
      updateIdeaInFeedCache(queryClient, ideaId, patch);

      return { prevIdea, prevFeed };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prevIdea) {
        queryClient.setQueryData(['idea', ideaId], ctx.prevIdea);
      }
      if (ctx?.prevFeed) {
        for (const [key, data] of ctx.prevFeed) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error('Could not update like');
    },
    onSuccess: (data) => {
      queryClient.setQueryData<IIdea>(['idea', ideaId], (old) =>
        old
          ? {
              ...old,
              liked: data.liked,
              likeCount: data.likeCount,
            }
          : old
      );
      updateIdeaInFeedCache(queryClient, ideaId, (i) =>
        i._id !== ideaId
          ? i
          : { ...i, liked: data.liked, likeCount: data.likeCount }
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
    },
  });
}

export function useToggleSave(ideaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ saved }: { saved: boolean }) => {
      if (saved) {
        const { usersApi } = await import('@/lib/api/users.api');
        await usersApi.unsaveIdea(ideaId);
      } else {
        const { usersApi } = await import('@/lib/api/users.api');
        await usersApi.saveIdea(ideaId);
      }
      return { saved: !saved };
    },
    onMutate: async ({ saved }) => {
      await queryClient.cancelQueries({ queryKey: ['idea', ideaId] });
      await queryClient.cancelQueries({ queryKey: ['saved-ideas'] });
      const prev = queryClient.getQueryData<IIdea>(['idea', ideaId]);
      if (prev) {
        queryClient.setQueryData<IIdea>(['idea', ideaId], {
          ...prev,
          saved: !saved,
        });
      }
      updateIdeaInFeedCache(queryClient, ideaId, (i) => ({
        ...i,
        saved: !saved,
      }));

      // If user unsaves from the Saved list, remove it immediately.
      if (saved) {
        queryClient.setQueriesData<{
          pages: Array<{ ideas: IIdea[]; meta?: { nextCursor?: string; hasMore?: boolean } }>;
          pageParams: unknown[];
        }>({ queryKey: ['saved-ideas'] }, (old) => {
          if (!old?.pages) return old;
          return {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              ideas: (p.ideas ?? []).filter((x) => x._id !== ideaId),
            })),
          };
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['idea', ideaId], ctx.prev);
      }
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['saved-ideas'] });
      toast.error('Could not update bookmark');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      void queryClient.invalidateQueries({ queryKey: ['saved-ideas'] });
    },
  });
}

export function useShareIdea(ideaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (source: string = 'feed') =>
      ideasApi.shareIdea(ideaId, {
        sessionId:
          typeof window !== 'undefined'
            ? sessionStorage.getItem('ideahub_behavior_session') ??
              `share-${Date.now()}`
            : undefined,
        source,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<IIdea>(['idea', ideaId], updated);
      updateIdeaInFeedCache(queryClient, ideaId, () => updated);
    },
  });
}

export function useRecordIdeaView(
  ideaId: string,
  source: 'feed' | 'search' | 'profile' | 'notification' | 'trending' = 'feed'
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { behaviorSessionId } = await import('@/lib/api/behavior.api');
      const sessionId = behaviorSessionId();
      const viewKey = `ideahub_viewed_${ideaId}`;
      if (typeof window !== 'undefined' && sessionStorage.getItem(viewKey)) {
        return null;
      }
      const data = await ideasApi.recordView(ideaId, { sessionId, source });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(viewKey, '1');
      }
      return data;
    },
    onSuccess: (data) => {
      if (!data) return;
      queryClient.setQueryData<IIdea>(['idea', ideaId], (old) =>
        old ? { ...old, viewCount: data.viewCount } : old
      );
      updateIdeaInFeedCache(queryClient, ideaId, (i) =>
        i._id !== ideaId ? i : { ...i, viewCount: data.viewCount }
      );
    },
  });
}

export function useCreateIdea() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (payload: CreateIdeaPayload) => ideasApi.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const prev = queryClient.getQueriesData({ queryKey: ['feed'] });
      if (!user) return { prev };

      const optimistic: IIdea = {
        _id: `temp-${Date.now()}`,
        authorId: user,
        title: payload.title,
        description: payload.description,
        slug: 'draft',
        category: payload.category,
        tags: payload.tags,
        status: 'published',
        visibility: payload.visibility,
        media: payload.media.map((m, idx) => ({
          _id: `temp-m-${idx}`,
          mediaType: m.mediaType,
          firebaseUrl: m.firebaseUrl ?? '',
          cdnUrl: m.cdnUrl,
          publicId: m.publicId ?? '',
          thumbnailUrl: m.thumbnailUrl ?? m.cdnUrl,
          mimeType: m.mimeType,
          scanStatus: 'pending' as const,
          scanViolations: [],
        })),
        collaboratorsOpen: payload.collaboratorsOpen,
        requiredSkills: payload.requiredSkills,
        collaborators: [],
        likeCount: 0,
        viewCount: 0,
        commentCount: 0,
        trendingScore: 0,
        isFeatured: false,
        contentScanScore: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        liked: false,
        saved: false,
        shareCount: 0,
      };

      const prependOptimistic = (old: {
        pages: FeedPage[];
        pageParams: unknown[];
      }) => {
        if (!old?.pages?.length) {
          return {
            pageParams: [undefined] as unknown[],
            pages: [
              {
                ideas: [optimistic],
                meta: { hasMore: true },
              },
            ],
          };
        }
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, ideas: [optimistic, ...first.ideas] },
            ...rest,
          ],
        };
      };

      queryClient.setQueriesData<{
        pages: FeedPage[];
        pageParams: unknown[];
      }>({ queryKey: ['feed'] }, (old) => {
        if (old === undefined) {
          return prependOptimistic({
            pages: [],
            pageParams: [undefined],
          });
        }
        return prependOptimistic(old);
      });

      // Default home feed key — ensures cache exists even before first /feed fetch.
      queryClient.setQueryData<{
        pages: FeedPage[];
        pageParams: unknown[];
      }>(['feed', ''], (old) => {
        if (old === undefined) {
          return prependOptimistic({
            pages: [],
            pageParams: [undefined],
          });
        }
        return prependOptimistic(old);
      });

      return { prev };
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.prev) {
        for (const [key, data] of ctx.prev) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(extractApiError(err));
    },
    onSuccess: (data) => {
      if (data?._id) {
        queryClient.setQueryData<IIdea>(['idea', data._id], data);
        // Put the real post on top; strip temp placeholders from cached feed pages.
        const mergeCreated = (old: {
          pages: FeedPage[];
          pageParams: unknown[];
        }) => {
          if (!old?.pages?.length) {
            return {
              pageParams: [undefined] as unknown[],
              pages: [{ ideas: [data], meta: { hasMore: true } }],
            };
          }
          const [first, ...rest] = old.pages;
          const cleaned = first.ideas.filter(
            (i) => !i._id.startsWith('temp-') && i._id !== data._id
          );
          return {
            ...old,
            pages: [{ ...first, ideas: [data, ...cleaned] }, ...rest],
          };
        };
        queryClient.setQueriesData<{
          pages: FeedPage[];
          pageParams: unknown[];
        }>({ queryKey: ['feed'] }, (old) => mergeCreated(old ?? { pages: [], pageParams: [] }));
        queryClient.setQueryData(['feed', ''], (old) =>
          mergeCreated(
            (old as { pages: FeedPage[]; pageParams: unknown[] }) ?? {
              pages: [],
              pageParams: [],
            }
          )
        );
      }
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (data?._id) {
        void queryClient.invalidateQueries({ queryKey: ['idea', data._id] });
      }
      toast.success('Idea posted!');
    },
  });
}

export function useAddComment(ideaId: string) {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: ({
      content,
      parentCommentId,
    }: {
      content: string;
      parentCommentId?: string;
    }) => ideasApi.addComment(ideaId, content, parentCommentId),
    onMutate: async ({ content, parentCommentId }) => {
      await queryClient.cancelQueries({
        queryKey: ['idea', ideaId, 'comments'],
      });
      const prev = queryClient.getQueryData<{
        pages: Array<{ comments: IComment[]; meta?: { nextCursor?: string } }>;
        pageParams: unknown[];
      }>(['idea', ideaId, 'comments']);

      if (!user || parentCommentId) {
        return { prev };
      }

      const optimistic: IComment = {
        _id: `temp-c-${Date.now()}`,
        ideaId,
        authorId: user,
        parentCommentId: null,
        content,
        likeCount: 0,
        status: 'visible',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<{
        pages: Array<{ comments: IComment[]; meta?: { nextCursor?: string } }>;
        pageParams: unknown[];
      }>(['idea', ideaId, 'comments'], (old) => {
        if (!old?.pages?.length) return old;
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, comments: [optimistic, ...first.comments] },
            ...rest,
          ],
        };
      });

      queryClient.setQueryData<IIdea>(['idea', ideaId], (old) =>
        old
          ? { ...old, commentCount: (old.commentCount ?? 0) + 1 }
          : old
      );
      updateIdeaInFeedCache(queryClient, ideaId, (i) => ({
        ...i,
        commentCount: (i.commentCount ?? 0) + 1,
      }));

      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(['idea', ideaId, 'comments'], ctx.prev);
      }
      void queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.error(extractApiError(err));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['idea', ideaId, 'comments'],
      });
      void queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useCollabRequest(ideaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { message: string; skillsOffered: string[] }) =>
      ideasApi.sendCollabRequest(ideaId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      toast.success('Collaboration request sent');
    },
    onError: (err) => toast.error(extractApiError(err)),
  });
}
