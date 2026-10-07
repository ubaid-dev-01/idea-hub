import mongoose from 'mongoose';

import type { ILiveRoomDocument } from '../models/LiveRoom.model.js';
import type { IUserDocument } from '../models/User.model.js';
import { User } from '../models/index.js';
import { userToApiPublic } from './serialize-user.js';

function pollTallies(
  poll: ILiveRoomDocument['livePoll']
): { options: string[]; tallies: number[]; question: string; isActive: boolean } | null {
  if (!poll?.question || !poll.options?.length) return null;
  const tallies = new Array(poll.options.length).fill(0);
  for (const v of poll.votes ?? []) {
    const i = v.optionIndex;
    if (i >= 0 && i < tallies.length) tallies[i]++;
  }
  return {
    question: poll.question,
    options: poll.options,
    tallies,
    isActive: Boolean(poll.isActive),
  };
}

function validationSummary(votes: ILiveRoomDocument['validationVotes']): {
  average: number | null;
  count: number;
} {
  const list = votes ?? [];
  if (!list.length) return { average: null, count: 0 };
  const sum = list.reduce((s, v) => s + v.score, 0);
  return { average: Math.round((sum / list.length) * 10) / 10, count: list.length };
}

export function liveRoomToApi(
  room: ILiveRoomDocument,
  userById: Map<string, IUserDocument>
): Record<string, unknown> {
  const j = room.toJSON() as Record<string, unknown>;
  const participants = (j.participants as Array<Record<string, unknown>>) ?? [];
  const mappedParticipants = participants.map((p) => {
    const uid = String(p.userId ?? '');
    const u = userById.get(uid);
    return {
      userId: uid,
      role: p.role,
      joinedAt: dateIso(p.joinedAt),
      leftAt: p.leftAt ? dateIso(p.leftAt) : null,
      user: u ? userToApiPublic(u) : null,
    };
  });

  const poll = pollTallies(room.livePoll);
  const val = validationSummary(room.validationVotes);
  const reactions = ((j.recentReactions as Array<Record<string, unknown>>) ?? [])
    .slice(-40)
    .map((r) => {
      const uid = String(r.userId ?? '');
      const u = userById.get(uid);
      return {
        userId: uid,
        emoji: r.emoji,
        createdAt: dateIso(r.createdAt),
        user: u ? userToApiPublic(u) : null,
      };
    });

  return {
    _id: String(j._id),
    ideaId: j.ideaId ? String(j.ideaId) : null,
    hostId: String(j.hostId),
    title: j.title,
    description: j.description ?? '',
    status: j.status,
    scheduledFor: dateIso(j.scheduledFor),
    startedAt: j.startedAt ? dateIso(j.startedAt) : null,
    endedAt: j.endedAt ? dateIso(j.endedAt) : null,
    provider: j.provider,
    providerRoomName: j.providerRoomName,
    maxParticipants: j.maxParticipants,
    participants: mappedParticipants,
    peakListeners: j.peakListeners ?? 0,
    totalJoined: j.totalJoined ?? 0,
    recordingUrl: j.recordingUrl ?? '',
    isRecorded: Boolean(j.isRecorded),
    livePoll: poll,
    validation: val,
    recentReactions: reactions,
    tags: j.tags ?? [],
    category: j.category ?? 'other',
    createdAt: dateIso(j.createdAt),
    updatedAt: dateIso(j.updatedAt),
  };
}

function dateIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return v != null ? String(v) : '';
}

export async function mapLiveRoomsToApi(
  rooms: ILiveRoomDocument[]
): Promise<Record<string, unknown>[]> {
  const userIds = new Set<string>();
  for (const room of rooms) {
    userIds.add(String(room.hostId));
    for (const p of room.participants ?? []) {
      userIds.add(String(p.userId));
    }
    for (const r of room.recentReactions ?? []) {
      userIds.add(String(r.userId));
    }
  }
  const ids = [...userIds].filter((id) => mongoose.Types.ObjectId.isValid(id));
  const users = await User.find({ _id: { $in: ids } });
  const map = new Map<string, IUserDocument>();
  for (const u of users) {
    map.set(String(u._id), u);
  }
  return rooms.map((r) => liveRoomToApi(r, map));
}
