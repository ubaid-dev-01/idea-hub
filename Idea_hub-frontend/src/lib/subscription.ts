import type { IUser } from '@/types/api';

/** Mirrors `Idea_hub-backend/src/lib/subscription.ts` getEffectivePlan — keep in sync. */
export type EffectivePlan = 'free' | 'pro' | 'investor';

export function getEffectivePlan(user: IUser | null | undefined): EffectivePlan {
  if (!user) return 'free';
  if (user.role === 'moderator' || user.role === 'super_admin') {
    return 'investor';
  }
  const sub = user.subscription;
  if (!sub || sub.plan === 'free') return 'free';
  if (sub.status === 'expired') return 'free';
  if (sub.plan !== 'pro' && sub.plan !== 'investor') return 'free';

  const end = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).getTime()
    : 0;
  if (end && end > Date.now()) return sub.plan;

  // After checkout, period end can lag until webhook/sync — don't force free.
  if (
    !end &&
    sub.stripeSubscriptionId &&
    (sub.status === 'active' || sub.status === 'cancelled')
  ) {
    return sub.plan;
  }

  return 'free';
}

export function canCreateMarketplaceListing(
  user: IUser | null | undefined
): boolean {
  const p = getEffectivePlan(user);
  return p === 'pro' || p === 'investor';
}
