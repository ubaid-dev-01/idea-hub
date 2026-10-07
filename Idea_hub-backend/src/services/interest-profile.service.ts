import mongoose from 'mongoose';

import type {
  BehaviorDeviceType,
  BehaviorEventSource,
  BehaviorEventType,
} from '../models/BehaviorEvent.model.js';
import { BehaviorEvent, Idea, User } from '../models/index.js';

const ALPHA = 0.12;
const MIN_WEIGHT = 0.008;
const MAX_CATEGORY_KEYS = 24;
const MAX_TAG_KEYS = 48;

function pruneWeights(
  w: Record<string, number>,
  maxKeys: number
): Record<string, number> {
  const entries = Object.entries(w).filter(([, v]) => v >= MIN_WEIGHT);
  entries.sort((a, b) => b[1] - a[1]);
  return Object.fromEntries(entries.slice(0, maxKeys));
}

function eventMultiplier(eventType: BehaviorEventType): number {
  switch (eventType) {
    case 'like':
      return 2;
    case 'comment':
      return 2.5;
    case 'save':
      return 2.2;
    case 'view':
      return 1;
    case 'share':
      return 2.8;
    case 'collab_request':
      return 3;
    default:
      return 0.6;
  }
}

/**
 * Persists a behavior row and nudges the viewer's `interestProfile` from the idea's category/tags.
 */
export async function recordBehaviorAndUpdateProfile(input: {
  userId: mongoose.Types.ObjectId;
  eventType: BehaviorEventType;
  ideaId: mongoose.Types.ObjectId | null;
  sessionId: string;
  durationMs?: number;
  scrollPercent?: number;
  source: BehaviorEventSource;
  deviceType: BehaviorDeviceType;
}): Promise<void> {
  await BehaviorEvent.create({
    userId: input.userId,
    eventType: input.eventType,
    ideaId: input.ideaId,
    sessionId: input.sessionId,
    durationMs: input.durationMs ?? 0,
    scrollPercent: input.scrollPercent ?? 0,
    source: input.source,
    deviceType: input.deviceType,
  });

  if (
    !input.ideaId ||
    !['view', 'like', 'comment', 'save', 'share'].includes(input.eventType)
  ) {
    return;
  }

  const idea = await Idea.findById(input.ideaId)
    .select('category tags')
    .lean<{ category: string; tags: string[] } | null>();
  if (!idea) return;

  const user = await User.findById(input.userId).select('interestProfile');
  if (!user) return;

  const mult = eventMultiplier(input.eventType);
  const cat = String(idea.category);
  const cw = {
    ...(user.interestProfile?.categoryWeights ?? {}),
  };
  cw[cat] = (cw[cat] ?? 0) * (1 - ALPHA) + mult * ALPHA;

  const tw = { ...(user.interestProfile?.tagWeights ?? {}) };
  for (const t of idea.tags ?? []) {
    const k = String(t).toLowerCase().trim();
    if (!k) continue;
    tw[k] = (tw[k] ?? 0) * (1 - ALPHA) + mult * ALPHA;
  }

  user.set('interestProfile.categoryWeights', pruneWeights(cw, MAX_CATEGORY_KEYS));
  user.set('interestProfile.tagWeights', pruneWeights(tw, MAX_TAG_KEYS));
  user.set('interestProfile.lastUpdated', new Date());
  user.markModified('interestProfile');
  await user.save();
}
