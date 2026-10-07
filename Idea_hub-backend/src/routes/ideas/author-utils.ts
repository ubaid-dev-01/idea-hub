import mongoose from 'mongoose';

import { userToApi } from '../../lib/serialize-user.js';
import { User } from '../../models/index.js';

export function deletedAuthorPlaceholder(id: string): Record<string, unknown> {
  return {
    _id: id,
    username: 'deleted',
    email: '',
    fullName: 'Deleted user',
    bio: '',
    avatarUrl: '',
    role: 'user',
    status: 'inactive',
    isEmailVerified: false,
    skills: [],
    followerCount: 0,
    followingCount: 0,
    totalIdeasPosted: 0,
    notificationPreferences: {},
    createdAt: new Date(0).toISOString(),
  };
}

export async function authorMapForIds(
  ids: string[]
): Promise<Map<string, Record<string, unknown>>> {
  const oids = [
    ...new Set(ids.filter((id) => mongoose.Types.ObjectId.isValid(id))),
  ].map((id) => new mongoose.Types.ObjectId(id));
  const users = await User.find({ _id: { $in: oids } });
  const m = new Map<string, Record<string, unknown>>();
  for (const u of users) {
    m.set(String(u._id), userToApi(u));
  }
  return m;
}
