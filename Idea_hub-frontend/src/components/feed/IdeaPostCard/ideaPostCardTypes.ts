import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';

import type { IIdea, IComment, IUser } from '@/types/api';

import type { ReactionKey } from './constants';

export type CommentsInfiniteData = InfiniteData<
  { comments: IComment[]; meta?: { nextCursor?: string } },
  unknown
>;

export interface IdeaPostCardContextValue {
  idea: IIdea;
  currentUserId?: string;
  author: IUser | null;
  isOwn: boolean;
  token: string | null;
  me: IUser | null;
  liked: boolean;
  saved: boolean;
  shareCount: number;
  ideaHref: string;
  fullUrl: string;
  isDesktop: boolean;
  cat: string;

  menuOpen: boolean;
  setMenuOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  shareOpen: boolean;
  setShareOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  likesOpen: boolean;
  setLikesOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  collabOpen: boolean;
  setCollabOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  delOpen: boolean;
  setDelOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  expandedTitle: boolean;
  setExpandedTitle: (v: boolean | ((b: boolean) => boolean)) => void;
  expandedDesc: boolean;
  setExpandedDesc: (v: boolean | ((b: boolean) => boolean)) => void;
  commentsOpen: boolean;
  setCommentsOpen: (v: boolean | ((b: boolean) => boolean)) => void;
  commentText: string;
  setCommentText: (v: string) => void;
  commentFocused: boolean;
  setCommentFocused: (v: boolean) => void;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  following: boolean;
  followHover: boolean;
  setFollowHover: (v: boolean) => void;
  heartAnim: boolean;
  floatLike: boolean;
  reactionOpen: boolean;
  setReactionOpen: (v: boolean) => void;
  pickedReaction: ReactionKey | null;
  setPickedReaction: (v: ReactionKey | null) => void;
  sendSpin: boolean;
  replyTo: { id: string; username: string } | null;
  setReplyTo: (v: { id: string; username: string } | null) => void;
  repliesOpen: Record<string, boolean>;
  setRepliesOpen: (
    v:
      | Record<string, boolean>
      | ((m: Record<string, boolean>) => Record<string, boolean>)
  ) => void;

  clearHold: () => void;
  onLikeClick: () => void;
  onLikeMouseDown: () => void;
  onLikeMouseUp: () => void;
  onLikeMouseLeave: () => void;
  onLikeTouchStart: () => void;
  onLikeTouchEnd: () => void;
  onLikeButtonClick: () => void;
  submitComment: () => Promise<void>;

  likeMut: UseMutationResult<unknown, Error, void, unknown>;
  saveMut: UseMutationResult<
    unknown,
    Error,
    { saved: boolean },
    unknown
  >;
  followMut: UseMutationResult<unknown, Error, void, unknown>;
  deleteMut: UseMutationResult<unknown, Error, void, unknown>;
  addComment: UseMutationResult<
    unknown,
    Error,
    { content: string; parentCommentId?: string },
    unknown
  >;

  commentsQ: UseInfiniteQueryResult<CommentsInfiniteData, Error>;

  visibleComments: IComment[];
  comments: IComment[];
}
