import { EventEmitter } from 'node:events';

/**
 * Decouples Mongoose hooks from higher-level services (notifications, queues).
 * Register listeners during application bootstrap.
 */
export const modelEvents = new EventEmitter();

export type LikeCreatedPayload = {
  likeId: string;
  userId: string;
  ideaId: string;
};

export type LikeRemovedPayload = {
  ideaId: string;
};

export type CollabRequestCreatedPayload = {
  ideaId: string;
  requestId: string;
  requesterId: string;
};

export type IdeaEngagementPayload = {
  ideaId: string;
  /** Present for `comment:created` */
  authorId?: string;
};

export type FollowCreatedPayload = {
  followingId: string;
};

export type CollabAcceptedPayload = {
  ideaId: string;
  requesterId: string;
};
