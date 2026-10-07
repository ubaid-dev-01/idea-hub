import type { IUserSubscription } from '../models/User.model.js';

export type EffectivePlan = 'free' | 'pro' | 'investor';

export const FREE_TIER_IDEAS_PER_MONTH = 3;

/** UTC month start for counting idea posts */
export function startOfUtcMonth(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function getSubscriptionFromUser(
  user:
    | {
        subscription?: IUserSubscription | null;
        role?: string;
      }
    | null
    | undefined
): IUserSubscription {
  const s = user?.subscription;
  if (s && typeof s === 'object') {
    return {
      plan: s.plan ?? 'free',
      status: s.status ?? 'active',
      stripeCustomerId: s.stripeCustomerId ?? '',
      stripeSubscriptionId: s.stripeSubscriptionId ?? '',
      currentPeriodEnd: s.currentPeriodEnd ?? null,
    };
  }
  return {
    plan: 'free',
    status: 'active',
    stripeCustomerId: '',
    stripeSubscriptionId: '',
    currentPeriodEnd: null,
  };
}

/**
 * Paid access while period not ended; cancelled subscriptions stay valid until
 * `currentPeriodEnd` (Stripe behavior).
 * If period end is missing but Stripe sub id + active status exist (webhook lag),
 * still treat as paid so checkout success is not stuck on free.
 */
export function getEffectivePlan(user: {
  subscription?: IUserSubscription | null;
  role?: string;
}): EffectivePlan {
  if (user.role === 'moderator' || user.role === 'super_admin') {
    return 'investor';
  }
  const s = getSubscriptionFromUser(user);
  if (s.plan === 'free') return 'free';
  if (s.status === 'expired') return 'free';
  if (s.plan !== 'pro' && s.plan !== 'investor') return 'free';

  const end = s.currentPeriodEnd
    ? new Date(s.currentPeriodEnd).getTime()
    : 0;
  if (end && end > Date.now()) return s.plan;

  if (
    !end &&
    s.stripeSubscriptionId &&
    (s.status === 'active' || s.status === 'cancelled')
  ) {
    return s.plan;
  }

  return 'free';
}

export function hasPaidProOrInvestor(user: {
  subscription?: IUserSubscription | null;
  role?: string;
}): boolean {
  const p = getEffectivePlan(user);
  return p === 'pro' || p === 'investor';
}

export function hasInvestorAccess(user: {
  subscription?: IUserSubscription | null;
  role?: string;
}): boolean {
  return getEffectivePlan(user) === 'investor';
}

/** BullMQ job priority: higher = processed sooner */
export function scanJobPriorityForUser(user: {
  subscription?: IUserSubscription | null;
  role?: string;
}): number {
  if (user.role === 'moderator' || user.role === 'super_admin') return 25;
  const p = getEffectivePlan(user);
  if (p === 'investor') return 20;
  if (p === 'pro') return 10;
  return 1;
}
