import mongoose from 'mongoose';

import {
  Follow,
  Idea,
  LiveRoom,
  LiveRoomRsvp,
  Notification,
  SavedIdea,
  User,
  type ILiveRoomDocument,
} from '../models/index.js';

function linkMediaPayload(recordingUrl: string, title: string): Record<string, unknown> {
  return {
    mediaType: 'link',
    firebaseUrl: recordingUrl,
    cdnUrl: recordingUrl,
    publicId: '',
    thumbnailUrl: '',
    fileSizeBytes: 0,
    mimeType: 'video/mp4',
    durationSeconds: 0,
    scanStatus: 'approved',
    scanViolations: [],
    metadata: { source: 'live_room_recording', title },
  };
}

export async function attachLiveRecordingToIdea(params: {
  ideaId: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  recordingUrl: string;
  roomTitle: string;
}): Promise<void> {
  const idea = await Idea.findById(params.ideaId).select('authorId').lean();
  if (!idea || String(idea.authorId) !== String(params.hostId)) {
    return;
  }
  await Idea.updateOne(
    { _id: params.ideaId },
    { $push: { media: linkMediaPayload(params.recordingUrl, params.roomTitle) } }
  );
}

export async function notifyLiveRoomStarted(room: ILiveRoomDocument): Promise<void> {
  const host = await User.findById(room.hostId).select('username fullName').lean();
  const hostLabel = host?.fullName?.trim() || host?.username || 'Someone';
  const title = `🔴 LIVE — ${hostLabel} started a room`;
  const body =
    room.title.length > 120 ? `${room.title.slice(0, 117)}…` : room.title;

  const recipientIds = new Set<string>();

  const followers = await Follow.find({ followingId: room.hostId })
    .select('followerId')
    .lean();
  for (const f of followers) {
    if (String(f.followerId) !== String(room.hostId)) {
      recipientIds.add(String(f.followerId));
    }
  }

  if (room.ideaId) {
    const savers = await SavedIdea.find({ ideaId: room.ideaId })
      .select('userId')
      .lean();
    for (const s of savers) {
      if (String(s.userId) !== String(room.hostId)) {
        recipientIds.add(String(s.userId));
      }
    }
  }

  const docs = [...recipientIds].map((rid) => ({
    recipientId: new mongoose.Types.ObjectId(rid),
    senderId: room.hostId,
    type: 'live_room_started' as const,
    referenceId: room._id,
    referenceType: 'live_room' as const,
    title,
    body,
    isRead: false,
    isPushSent: false,
    metadata: {
      roomTitle: room.title,
      ideaId: room.ideaId ? String(room.ideaId) : null,
    },
  }));

  if (docs.length > 0) {
    await Notification.insertMany(docs);
  }
}

export async function notifyLiveRoomRsvpReminder(
  room: ILiveRoomDocument
): Promise<void> {
  const rows = await LiveRoomRsvp.find({ roomId: room._id })
    .select('userId')
    .lean();
  const title = 'Live room starting soon';
  const body = `"${room.title}" starts in about 5 minutes.`;
  const docs = rows
    .filter((r) => String(r.userId) !== String(room.hostId))
    .map((r) => ({
      recipientId: r.userId,
      senderId: room.hostId,
      type: 'live_room_reminder' as const,
      referenceId: room._id,
      referenceType: 'live_room' as const,
      title,
      body,
      isRead: false,
      isPushSent: false,
      metadata: {},
    }));
  if (docs.length > 0) {
    await Notification.insertMany(docs);
  }
}

export async function roomsNeedingRsvpReminder(): Promise<ILiveRoomDocument[]> {
  const now = Date.now();
  const windowStart = new Date(now + 4 * 60 * 1000);
  const windowEnd = new Date(now + 6 * 60 * 1000);
  return LiveRoom.find({
    status: 'scheduled',
    scheduledFor: { $gte: windowStart, $lte: windowEnd },
    $or: [{ rsvpReminderSentAt: { $exists: false } }, { rsvpReminderSentAt: null }],
  }).exec();
}
