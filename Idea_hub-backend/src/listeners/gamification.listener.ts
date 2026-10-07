import { logger } from '../lib/logger.js';
import { Idea } from '../models/index.js';

const log = logger.child({ module: 'gamification' });
import {
  modelEvents,
  type CollabAcceptedPayload,
  type CollabRequestCreatedPayload,
  type FollowCreatedPayload,
  type IdeaEngagementPayload,
  type LikeCreatedPayload,
} from '../models/modelEvents.js';
import {
  isGamificationEnabled,
  onCollabAccepted,
  onCollabRequestSent,
  onCommentPosted,
  onIdeaReceivedLike,
  onLikeGiven,
  onNewFollower,
} from '../services/gamification.service.js';

export function registerGamificationListeners(): void {
  if (!isGamificationEnabled()) return;

  modelEvents.on('like:created', (p: LikeCreatedPayload) => {
    void (async () => {
      try {
        const idea = await Idea.findById(p.ideaId)
          .select('authorId likeCount')
          .lean<{ authorId: { toString(): string }; likeCount?: number } | null>();
        if (!idea) return;
        const authorId = String(idea.authorId);
        if (authorId === p.userId) return;
        await onLikeGiven(p.userId);
        await onIdeaReceivedLike(authorId, idea.likeCount ?? 0);
      } catch (err) {
        log.error({ err, event: 'like:created' }, 'handler failed');
      }
    })();
  });

  modelEvents.on('comment:created', (p: IdeaEngagementPayload) => {
    if (!p.authorId) return;
    void onCommentPosted(p.authorId).catch((err) => {
      console.error('[gamification] comment:created', err);
    });
  });

  modelEvents.on('collab:request-created', (p: CollabRequestCreatedPayload) => {
    void onCollabRequestSent(p.requesterId).catch((err) => {
      log.error({ err, event: 'collab:request-created' }, 'handler failed');
    });
  });

  modelEvents.on('collab:accepted', (p: CollabAcceptedPayload) => {
    void onCollabAccepted(p.requesterId).catch((err) => {
      console.error('[gamification] collab:accepted', err);
    });
  });

  modelEvents.on('follow:created', (p: FollowCreatedPayload) => {
    void onNewFollower(p.followingId).catch((err) => {
      log.error({ err, event: 'follow:created' }, 'handler failed');
    });
  });

  log.info('event listeners registered');
}
