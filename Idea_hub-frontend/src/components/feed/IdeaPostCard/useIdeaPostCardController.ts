'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import {
  useAddComment,
  useIdeaComments,
  useToggleLike,
  useToggleSave,
} from '@/hooks/useIdeas';
import { useIsDesktopModal } from '@/hooks/useMediaQuery';
import { ideasApi } from '@/lib/api/ideas.api';
import { usersApi } from '@/lib/api/users.api';
import { resolveAuthor } from '@/lib/author';
import { useAuthStore } from '@/store/authStore';
import type { IIdea } from '@/types/api';

import type { IdeaPostCardContextValue } from './ideaPostCardTypes';
import type { ReactionKey } from './constants';

export function useIdeaPostCardController(
  idea: IIdea,
  currentUserId?: string
): IdeaPostCardContextValue {
  const author = resolveAuthor(idea.authorId);
  const isDesktop = useIsDesktopModal();
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.user);

  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [collabOpen, setCollabOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [expandedTitle, setExpandedTitle] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followHover, setFollowHover] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [floatLike, setFloatLike] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [pickedReaction, setPickedReaction] = useState<ReactionKey | null>(null);
  const [sendSpin, setSendSpin] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [repliesOpen, setRepliesOpen] = useState<Record<string, boolean>>({});

  const holdTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const likeMut = useToggleLike(idea._id);
  const saveMut = useToggleSave(idea._id);
  const addComment = useAddComment(idea._id);
  const commentsQ = useIdeaComments(idea._id, commentsOpen);

  useQuery({
    queryKey: ['idea', idea._id, 'flags'],
    queryFn: async () => {
      const full = await ideasApi.getById(idea._id);
      queryClient.setQueryData<IIdea>(['idea', idea._id], full);
      queryClient.setQueriesData<{
        pages: Array<{
          ideas: IIdea[];
          meta?: { nextCursor?: string; hasMore?: boolean };
        }>;
        pageParams: unknown[];
      }>({ queryKey: ['feed'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            ideas: p.ideas.map((it) =>
              it._id === idea._id
                ? {
                    ...it,
                    liked: full.liked ?? it.liked,
                    saved: full.saved ?? it.saved,
                  }
                : it
            ),
          })),
        };
      });
      return { liked: full.liked ?? false, saved: full.saved ?? false };
    },
    enabled:
      Boolean(token) &&
      (idea.liked === undefined || idea.saved === undefined) &&
      !idea._id.startsWith('temp-'),
    staleTime: 60_000,
  });

  const liked = idea.liked ?? false;
  const saved = idea.saved ?? false;
  const shareCount = idea.shareCount ?? 0;

  const isOwn = Boolean(
    author && currentUserId && author._id === currentUserId
  );

  const myFollowingQ = useQuery({
    queryKey: ['me', 'following'],
    queryFn: () => usersApi.getFollowing(),
    enabled: Boolean(me),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!author || isOwn) return;
    const fromProfileFlag = Boolean(author.isFollowing);
    const fromMyList = Boolean(
      myFollowingQ.data?.users?.some((u) => u._id === author._id)
    );
    setFollowing(fromProfileFlag || fromMyList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [author?._id, isOwn, myFollowingQ.data?.users]);

  const followMut = useMutation({
    mutationFn: async () => {
      if (!author) throw new Error('No author');
      if (following) await usersApi.unfollow(author._id);
      else await usersApi.follow(author._id);
    },
    onMutate: async () => {
      setFollowing((f) => !f);
    },
    onError: () => {
      setFollowing((f) => !f);
      toast.error('Could not update follow');
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'following'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => ideasApi.delete(idea._id),
    onSuccess: () => {
      toast.success('Idea deleted');
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      setDelOpen(false);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Delete failed'),
  });

  const pages = commentsQ.data?.pages ?? [];
  const rawComments = pages.flatMap((p) => p.comments);
  const comments = [...rawComments].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const visibleComments = commentsOpen
    ? comments.slice(0, 20)
    : comments.slice(0, 3);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  const onLikeClick = useCallback(() => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (!token) {
      toast.error('Log in to like ideas');
      return;
    }
    setPickedReaction(null);
    setHeartAnim(true);
    if (!liked) setFloatLike(true);
    window.setTimeout(() => setHeartAnim(false), 600);
    window.setTimeout(() => setFloatLike(false), 900);
    void likeMut.mutateAsync().catch(() => undefined);
  }, [liked, likeMut, token]);

  const onLikeMouseDown = useCallback(() => {
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setReactionOpen(true);
    }, 500);
  }, [clearHold]);

  const onLikeMouseUp = useCallback(() => {
    clearHold();
  }, [clearHold]);

  const onLikeMouseLeave = useCallback(() => {
    clearHold();
  }, [clearHold]);

  const onLikeTouchStart = useCallback(() => {
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      setReactionOpen(true);
    }, 500);
  }, [clearHold]);

  const onLikeTouchEnd = useCallback(() => {
    clearHold();
  }, [clearHold]);

  const onLikeButtonClick = useCallback(() => {
    if (reactionOpen) return;
    onLikeClick();
  }, [reactionOpen, onLikeClick]);

  const ideaHref = `/ideas/${idea._id}`;
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const fullUrl = `${origin}${ideaHref}`;

  const submitComment = useCallback(async () => {
    const text = (replyTo ? `@${replyTo.username} ` : '') + commentText.trim();
    if (!text || !token) return;
    setSendSpin(true);
    window.setTimeout(() => setSendSpin(false), 500);
    try {
      await addComment.mutateAsync({
        content: text,
        parentCommentId: replyTo?.id,
      });
      setCommentText('');
      setReplyTo(null);
    } catch {
      /* toast in hook */
    }
  }, [addComment, commentText, replyTo, token]);

  const cat = String(idea.category);

  return useMemo(
    () => ({
      idea,
      currentUserId,
      author,
      isOwn,
      token,
      me,
      liked,
      saved,
      shareCount,
      ideaHref,
      fullUrl,
      isDesktop,
      cat,
      menuOpen,
      setMenuOpen,
      shareOpen,
      setShareOpen,
      likesOpen,
      setLikesOpen,
      collabOpen,
      setCollabOpen,
      delOpen,
      setDelOpen,
      expandedTitle,
      setExpandedTitle,
      expandedDesc,
      setExpandedDesc,
      commentsOpen,
      setCommentsOpen,
      commentText,
      setCommentText,
      commentFocused,
      setCommentFocused,
      playingId,
      setPlayingId,
      following,
      followHover,
      setFollowHover,
      heartAnim,
      floatLike,
      reactionOpen,
      setReactionOpen,
      pickedReaction,
      setPickedReaction,
      sendSpin,
      replyTo,
      setReplyTo,
      repliesOpen,
      setRepliesOpen,
      clearHold,
      onLikeClick,
      onLikeMouseDown,
      onLikeMouseUp,
      onLikeMouseLeave,
      onLikeTouchStart,
      onLikeTouchEnd,
      onLikeButtonClick,
      submitComment,
      likeMut,
      saveMut,
      followMut,
      deleteMut,
      addComment,
      commentsQ,
      visibleComments,
      comments,
    }) as IdeaPostCardContextValue,
    [
      idea,
      currentUserId,
      author,
      isOwn,
      token,
      me,
      liked,
      saved,
      shareCount,
      ideaHref,
      fullUrl,
      isDesktop,
      cat,
      menuOpen,
      shareOpen,
      likesOpen,
      collabOpen,
      delOpen,
      expandedTitle,
      expandedDesc,
      commentsOpen,
      commentText,
      commentFocused,
      playingId,
      following,
      followHover,
      heartAnim,
      floatLike,
      reactionOpen,
      pickedReaction,
      sendSpin,
      replyTo,
      repliesOpen,
      clearHold,
      onLikeClick,
      onLikeMouseDown,
      onLikeMouseUp,
      onLikeMouseLeave,
      onLikeTouchStart,
      onLikeTouchEnd,
      onLikeButtonClick,
      submitComment,
      likeMut,
      saveMut,
      followMut,
      deleteMut,
      addComment,
      commentsQ,
      visibleComments,
      comments,
    ]
  );
}
