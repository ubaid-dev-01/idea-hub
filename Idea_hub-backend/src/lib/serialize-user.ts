import type { IUserDocument, IUserSubscription } from '../models/User.model.js';

/** Shape expected by web `IUser` (dates as ISO strings). */

function subscriptionToApi(user: IUserDocument): {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
} {
  const raw = user.subscription as IUserSubscription | undefined;
  if (!raw || typeof raw !== 'object') {
    return {
      plan: 'free',
      status: 'active',
      currentPeriodEnd: null,
    };
  }
  const end = raw.currentPeriodEnd;
  return {
    plan: raw.plan ?? 'free',
    status: raw.status ?? 'active',
    currentPeriodEnd:
      end instanceof Date
        ? end.toISOString()
        : end
          ? String(end)
          : null,
  };
}

/** Public profile responses — email is not exposed. */
export function userToApiPublic(user: IUserDocument): Record<string, unknown> {
  const j = userToApi(user);
  delete j.email;
  delete j.verificationRequestAt;
  delete j.verificationRequestMessage;
  return { ...j, email: '' };
}

export function userToApi(user: IUserDocument): Record<string, unknown> {
  const asAny = user as unknown as Record<string, unknown> & {
    toJSON?: () => unknown;
  };
  // Some routes use `.lean()` and pass plain JS objects here.
  // Mongoose docs have `toJSON()`, plain objects don't.
  const j =
    typeof asAny.toJSON === 'function'
      ? (asAny.toJSON() as Record<string, unknown>)
      : (asAny as Record<string, unknown>);
  const createdAt = j.createdAt;
  return {
    _id: String(j._id),
    username: j.username,
    email: j.email,
    fullName: j.fullName,
    bio: j.bio ?? '',
    avatarUrl: j.avatarUrl ?? '',
    role: j.role,
    status: j.status,
    isEmailVerified: j.isEmailVerified ?? false,
    skills: j.skills ?? [],
    followerCount: j.followerCount ?? 0,
    followingCount: j.followingCount ?? 0,
    totalIdeasPosted: j.totalIdeasPosted ?? 0,
    notificationPreferences: j.notificationPreferences ?? {},
    verifiedInnovator: Boolean(j.verifiedInnovator),
    verificationRequestAt:
      j.verificationRequestAt instanceof Date
        ? j.verificationRequestAt.toISOString()
        : j.verificationRequestAt
          ? String(j.verificationRequestAt)
          : null,
    verificationRequestMessage: String(j.verificationRequestMessage ?? ''),
    subscription: subscriptionToApi(user),
    createdAt:
      createdAt instanceof Date
        ? createdAt.toISOString()
        : String(createdAt ?? ''),
  };
}
