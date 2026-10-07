import { logger } from '../lib/logger.js';
import {
  modelEvents,
  type CollabRequestCreatedPayload,
  type IdeaEngagementPayload,
  type LikeCreatedPayload,
  type LikeRemovedPayload,
} from '../models/modelEvents.js';
import { scheduleValidationRecalculate } from '../services/ValidationEngine.js';

function onIdeaId(ideaId: string): void {
  scheduleValidationRecalculate(ideaId);
}

export function registerValidationListeners(): void {
  modelEvents.on('like:created', (p: LikeCreatedPayload) => {
    onIdeaId(p.ideaId);
  });

  modelEvents.on('like:removed', (p: LikeRemovedPayload) => {
    onIdeaId(p.ideaId);
  });

  modelEvents.on('collab:request-created', (p: CollabRequestCreatedPayload) => {
    onIdeaId(p.ideaId);
  });

  modelEvents.on('comment:created', (p: IdeaEngagementPayload) => {
    onIdeaId(p.ideaId);
  });

  logger.child({ module: 'validation' }).info('event listeners registered');
}
