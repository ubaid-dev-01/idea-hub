import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

import {
  LIVE_FREE_MAX_PARTICIPANTS,
  liveRoomProvider,
  liveRoomsEnabled,
} from '../config/live.config.js';
import { mapLiveRoomsToApi } from '../lib/serialize-live-room.js';
import { userToApiPublic } from '../lib/serialize-user.js';
import { optionalAuth } from '../middleware/optional-auth.js';
import { requireAuth } from '../middleware/require-auth.js';
import type { ILiveRoomDocument } from '../models/LiveRoom.model.js';
import {
  Idea,
  LiveRoom,
  LiveRoomMessage,
  LiveRoomQuestion,
  LiveRoomRsvp,
  User,
} from '../models/index.js';
import { dailyCreateRoom, dailyMeetingToken, dailyRoomJoinUrl } from '../services/daily-live.service.js';
import {
  attachLiveRecordingToIdea,
  notifyLiveRoomStarted,
} from '../services/live-rooms.service.js';

export const liveRoomsRouter = Router();

const CATEGORIES = new Set([
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
]);

const REACTION_EMOJIS = new Set(['👍', '💡', '🔥', '❓']);

const MSG_PAGE = 40;
const Q_PAGE = 50;

function requireDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      data: null,
    });
    return;
  }
  next();
}

function requireLive(_req: Request, res: Response, next: NextFunction): void {
  if (!liveRoomsEnabled()) {
    res.status(404).json({
      success: false,
      message: 'Live rooms are not enabled',
      data: null,
    });
    return;
  }
  next();
}

function activeCount(room: ILiveRoomDocument): number {
  return (room.participants ?? []).filter((p) => !p.leftAt).length;
}

function listenerCount(room: ILiveRoomDocument): number {
  return (room.participants ?? []).filter(
    (p) => !p.leftAt && p.role === 'listener'
  ).length;
}

function findOpenParticipant(
  room: ILiveRoomDocument,
  userId: mongoose.Types.ObjectId
) {
  return (room.participants ?? []).find(
    (p) => String(p.userId) === String(userId) && !p.leftAt
  );
}

liveRoomsRouter.use(requireDb);
liveRoomsRouter.use(requireLive);

liveRoomsRouter.get('/live-now', optionalAuth, async (_req, res) => {
  const rooms = await LiveRoom.find({ status: 'live' })
    .sort({ startedAt: -1, _id: -1 })
    .limit(12);
  const data = await mapLiveRoomsToApi(rooms);
  res.json({ success: true, message: 'OK', data });
});

liveRoomsRouter.get('/', optionalAuth, async (req, res) => {
  const status =
    typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const filter: Record<string, unknown> = {};
  if (status === 'live' || status === 'scheduled' || status === 'ended') {
    filter.status = status;
  }
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  const rooms = await LiveRoom.find(filter)
    .sort({ _id: -1 })
    .limit(24);
  const data = await mapLiveRoomsToApi(rooms);
  const nextCursor =
    rooms.length > 0 ? String(rooms[rooms.length - 1]!._id) : undefined;
  res.json({
    success: true,
    message: 'OK',
    data,
    meta: { nextCursor, hasMore: rooms.length >= 24 },
  });
});

liveRoomsRouter.get('/:id', optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  const [payload] = await mapLiveRoomsToApi([room]);
  let hasRsvp = false;
  const uid = res.locals.authUserId as string | undefined;
  if (uid && mongoose.Types.ObjectId.isValid(uid)) {
    hasRsvp = Boolean(
      await LiveRoomRsvp.exists({
        roomId: room._id,
        userId: new mongoose.Types.ObjectId(uid),
      })
    );
  }
  res.json({
    success: true,
    message: 'OK',
    data: { ...payload, hasRsvp },
  });
});

liveRoomsRouter.post('/', requireAuth, async (req, res) => {
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  const category =
    typeof body.category === 'string' ? body.category.trim() : 'other';
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const ideaRaw = body.ideaId;
  let ideaId: mongoose.Types.ObjectId | null = null;
  if (ideaRaw != null && ideaRaw !== '') {
    const sid = String(ideaRaw);
    if (!mongoose.Types.ObjectId.isValid(sid)) {
      res.status(400).json({
        success: false,
        message: 'Invalid idea id',
        data: null,
      });
      return;
    }
    const idea = await Idea.findById(sid).select('authorId').lean();
    if (!idea || String(idea.authorId) !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only link rooms to your own ideas',
        data: null,
      });
      return;
    }
    ideaId = new mongoose.Types.ObjectId(sid);
  }

  const scheduledRaw = body.scheduledFor;
  let scheduledFor: Date;
  if (typeof scheduledRaw === 'string' && scheduledRaw.trim()) {
    scheduledFor = new Date(scheduledRaw);
    if (Number.isNaN(scheduledFor.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid scheduledFor',
        data: null,
      });
      return;
    }
  } else {
    scheduledFor = new Date();
  }

  if (!title || title.length > 200) {
    res.status(400).json({
      success: false,
      message: 'title is required (max 200 chars)',
      data: null,
    });
    return;
  }

  if (!CATEGORIES.has(category)) {
    res.status(400).json({
      success: false,
      message: 'Invalid category',
      data: null,
    });
    return;
  }

  const provider = liveRoomProvider();
  const providerRoomName = `lr_${nanoid(12)}`;
  if (provider === 'daily') {
    try {
      await dailyCreateRoom(providerRoomName);
    } catch (err) {
      console.error('[live-rooms] dailyCreateRoom', err);
      res.status(502).json({
        success: false,
        message: 'Could not create video room (Daily.co)',
        data: null,
      });
      return;
    }
  }

  const tagList = tags
    .map((t) => String(t).trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);

  const room = await LiveRoom.create({
    ideaId,
    hostId: new mongoose.Types.ObjectId(userId),
    title,
    description,
    status: 'scheduled',
    scheduledFor,
    providerRoomName,
    provider,
    maxParticipants: LIVE_FREE_MAX_PARTICIPANTS,
    tags: tagList,
    category,
  });

  const [payload] = await mapLiveRoomsToApi([room]);
  res.status(201).json({ success: true, message: 'Created', data: payload });
});

liveRoomsRouter.post('/:id/rsvp', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || room.status !== 'scheduled') {
    res.status(400).json({
      success: false,
      message: 'RSVP only for scheduled rooms',
      data: null,
    });
    return;
  }
  try {
    await LiveRoomRsvp.create({
      roomId: room._id,
      userId: new mongoose.Types.ObjectId(userId),
    });
  } catch (err) {
    const dup =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000;
    if (!dup) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'RSVP failed',
        data: null,
      });
      return;
    }
  }
  res.json({ success: true, message: 'OK', data: { rsvped: true } });
});

liveRoomsRouter.delete('/:id/rsvp', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  await LiveRoomRsvp.deleteOne({
    roomId: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  });
  res.json({ success: true, message: 'OK', data: { rsvped: false } });
});

liveRoomsRouter.post('/:id/go-live', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  if (String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can go live',
      data: null,
    });
    return;
  }
  if (room.status === 'ended') {
    res.status(400).json({
      success: false,
      message: 'Room has ended',
      data: null,
    });
    return;
  }
  if (room.status === 'live') {
    const [payload] = await mapLiveRoomsToApi([room]);
    res.json({ success: true, message: 'OK', data: payload });
    return;
  }

  room.status = 'live';
  room.startedAt = new Date();
  await room.save();

  void notifyLiveRoomStarted(room);

  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/end', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const recordingUrl =
    typeof body.recordingUrl === 'string' ? body.recordingUrl.trim() : '';

  const room = await LiveRoom.findById(id);
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  if (String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can end the room',
      data: null,
    });
    return;
  }
  room.status = 'ended';
  room.endedAt = new Date();
  if (recordingUrl) {
    room.recordingUrl = recordingUrl.slice(0, 2000);
    room.isRecorded = true;
  }
  if (room.livePoll) {
    room.livePoll.isActive = false;
  }
  await room.save();

  if (recordingUrl && room.ideaId) {
    await attachLiveRecordingToIdea({
      ideaId: room.ideaId,
      hostId: room.hostId,
      recordingUrl: room.recordingUrl,
      roomTitle: room.title,
    });
  }

  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/token', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }

  const isHost = String(room.hostId) === userId;
  if (room.status !== 'live' && !isHost) {
    res.status(400).json({
      success: false,
      message: 'Room is not live',
      data: null,
    });
    return;
  }

  const user = await User.findById(userId).select('username fullName').lean();
  const userName =
    user?.fullName?.trim() || user?.username || 'Guest';

  if (room.provider === 'mock') {
    res.json({
      success: true,
      message: 'OK',
      data: {
        token: '',
        joinUrl: '',
        provider: 'mock',
        roomName: room.providerRoomName,
      },
    });
    return;
  }

  try {
    const token = await dailyMeetingToken({
      roomName: room.providerRoomName,
      userName,
      isOwner: isHost,
    });
    const joinUrl = dailyRoomJoinUrl(room.providerRoomName, token);
    res.json({
      success: true,
      message: 'OK',
      data: {
        token,
        joinUrl,
        provider: 'daily',
        roomName: room.providerRoomName,
      },
    });
  } catch (err) {
    console.error('[live-rooms] token', err);
    res.status(502).json({
      success: false,
      message: 'Could not create meeting token',
      data: null,
    });
  }
});

liveRoomsRouter.post('/:id/join', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const room = await LiveRoom.findById(id);
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  if (room.status !== 'live') {
    res.status(400).json({
      success: false,
      message: 'Room is not live',
      data: null,
    });
    return;
  }

  const isHost = String(room.hostId) === userId;
  if (!isHost && activeCount(room) >= room.maxParticipants) {
    res.status(403).json({
      success: false,
      message: 'Room is full',
      data: null,
    });
    return;
  }

  const existing = findOpenParticipant(room, uid);
  if (!existing) {
    const role = isHost ? 'host' : 'listener';
    room.participants.push({
      userId: uid,
      role,
      joinedAt: new Date(),
    });
    room.totalJoined = (room.totalJoined ?? 0) + 1;
  }

  const listeners = listenerCount(room);
  if (listeners > (room.peakListeners ?? 0)) {
    room.peakListeners = listeners;
  }
  await room.save();

  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/leave', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const room = await LiveRoom.findById(id);
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  const now = new Date();
  for (const p of room.participants ?? []) {
    if (String(p.userId) === String(uid) && !p.leftAt) {
      p.leftAt = now;
    }
  }
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/raise-hand', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const room = await LiveRoom.findById(id);
  if (!room || room.status !== 'live') {
    res.status(400).json({
      success: false,
      message: 'Room not live',
      data: null,
    });
    return;
  }
  const p = findOpenParticipant(room, uid);
  if (!p || p.role !== 'listener') {
    res.status(400).json({
      success: false,
      message: 'Only listeners can raise a hand',
      data: null,
    });
    return;
  }
  p.role = 'pending_speaker';
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/approve-speaker', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  const body = req.body as Record<string, unknown>;
  const target =
    typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(target)) {
    res.status(400).json({
      success: false,
      message: 'Invalid id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can approve speakers',
      data: null,
    });
    return;
  }
  const tid = new mongoose.Types.ObjectId(target);
  const p = findOpenParticipant(room, tid);
  if (!p || p.role !== 'pending_speaker') {
    res.status(400).json({
      success: false,
      message: 'User is not waiting to speak',
      data: null,
    });
    return;
  }
  p.role = 'speaker';
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/demote-speaker', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  const body = req.body as Record<string, unknown>;
  const target =
    typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(target)) {
    res.status(400).json({
      success: false,
      message: 'Invalid id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can demote speakers',
      data: null,
    });
    return;
  }
  const tid = new mongoose.Types.ObjectId(target);
  const p = findOpenParticipant(room, tid);
  if (!p || p.role !== 'speaker') {
    res.status(400).json({
      success: false,
      message: 'User is not a speaker',
      data: null,
    });
    return;
  }
  p.role = 'listener';
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.get('/:id/messages', optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id).select('_id').lean();
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const q: Record<string, unknown> = { roomId: room._id };
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    q._id = { $lt: new mongoose.Types.ObjectId(cursor) };
  }
  const rows = await LiveRoomMessage.find(q)
    .sort({ _id: -1 })
    .limit(MSG_PAGE)
    .lean();
  const userIds = [...new Set(rows.map((m) => String(m.userId)))];
  const users = await User.find({ _id: { $in: userIds } });
  const umap = new Map(users.map((u) => [String(u._id), u]));
  const data = rows.reverse().map((m) => ({
    _id: String(m._id),
    roomId: String(m.roomId),
    userId: String(m.userId),
    body: m.body,
    createdAt:
      m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : String(m.createdAt),
    user: umap.get(String(m.userId))
      ? userToApiPublic(umap.get(String(m.userId))!)
      : null,
  }));
  const nextCursor = rows.length > 0 ? String(rows[rows.length - 1]!._id) : undefined;
  res.json({
    success: true,
    message: 'OK',
    data,
    meta: { nextCursor, hasMore: rows.length >= MSG_PAGE },
  });
});

liveRoomsRouter.post('/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || room.status !== 'live') {
    res.status(400).json({
      success: false,
      message: 'Chat is only available while live',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    res.status(400).json({
      success: false,
      message: 'Message body required',
      data: null,
    });
    return;
  }
  const msg = await LiveRoomMessage.create({
    roomId: room._id,
    userId: new mongoose.Types.ObjectId(userId),
    body: text.slice(0, 2000),
  });
  const u = await User.findById(userId);
  res.status(201).json({
    success: true,
    message: 'Created',
    data: {
      _id: String(msg._id),
      roomId: String(msg.roomId),
      userId: String(msg.userId),
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      user: u ? userToApiPublic(u) : null,
    },
  });
});

liveRoomsRouter.get('/:id/questions', optionalAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id).select('_id').lean();
  if (!room) {
    res.status(404).json({
      success: false,
      message: 'Room not found',
      data: null,
    });
    return;
  }
  const rows = await LiveRoomQuestion.find({ roomId: room._id })
    .sort({ status: 1, createdAt: 1 })
    .limit(Q_PAGE)
    .lean();
  const userIds = [...new Set(rows.map((q) => String(q.userId)))];
  const users = await User.find({ _id: { $in: userIds } });
  const umap = new Map(users.map((u) => [String(u._id), u]));
  const data = rows.map((q) => ({
    _id: String(q._id),
    roomId: String(q.roomId),
    userId: String(q.userId),
    body: q.body,
    status: q.status,
    answeredAt: q.answeredAt
      ? q.answeredAt instanceof Date
        ? q.answeredAt.toISOString()
        : String(q.answeredAt)
      : null,
    createdAt:
      q.createdAt instanceof Date
        ? q.createdAt.toISOString()
        : String(q.createdAt),
    user: umap.get(String(q.userId))
      ? userToApiPublic(umap.get(String(q.userId))!)
      : null,
  }));
  res.json({ success: true, message: 'OK', data });
});

liveRoomsRouter.post('/:id/questions', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || room.status !== 'live') {
    res.status(400).json({
      success: false,
      message: 'Q&A only while live',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!text) {
    res.status(400).json({
      success: false,
      message: 'Question required',
      data: null,
    });
    return;
  }
  const q = await LiveRoomQuestion.create({
    roomId: room._id,
    userId: new mongoose.Types.ObjectId(userId),
    body: text.slice(0, 2000),
    status: 'queued',
  });
  const u = await User.findById(userId);
  res.status(201).json({
    success: true,
    message: 'Created',
    data: {
      _id: String(q._id),
      roomId: String(q.roomId),
      userId: String(q.userId),
      body: q.body,
      status: q.status,
      answeredAt: null,
      createdAt: q.createdAt.toISOString(),
      user: u ? userToApiPublic(u) : null,
    },
  });
});

liveRoomsRouter.post('/:id/questions/:qId/answer', requireAuth, async (req, res) => {
  const { id, qId } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(qId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can update the queue',
      data: null,
    });
    return;
  }
  const q = await LiveRoomQuestion.findOne({
    _id: qId,
    roomId: room._id,
  });
  if (!q) {
    res.status(404).json({
      success: false,
      message: 'Question not found',
      data: null,
    });
    return;
  }
  q.status = 'answered';
  q.answeredAt = new Date();
  await q.save();
  res.json({ success: true, message: 'OK', data: { _id: String(q._id), status: q.status } });
});

liveRoomsRouter.post('/:id/questions/:qId/dismiss', requireAuth, async (req, res) => {
  const { id, qId } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(qId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can update the queue',
      data: null,
    });
    return;
  }
  const q = await LiveRoomQuestion.findOne({
    _id: qId,
    roomId: room._id,
  });
  if (!q) {
    res.status(404).json({
      success: false,
      message: 'Question not found',
      data: null,
    });
    return;
  }
  q.status = 'dismissed';
  await q.save();
  res.json({ success: true, message: 'OK', data: { _id: String(q._id), status: q.status } });
});

liveRoomsRouter.post('/:id/poll', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || String(room.hostId) !== userId || room.status !== 'live') {
    res.status(403).json({
      success: false,
      message: 'Only the host can set a poll while live',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const question =
    typeof body.question === 'string' ? body.question.trim() : '';
  const options = Array.isArray(body.options) ? body.options : [];
  const optStrings = options
    .map((o) => String(o).trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!question || optStrings.length < 2) {
    res.status(400).json({
      success: false,
      message: 'Poll needs a question and at least 2 options',
      data: null,
    });
    return;
  }
  room.livePoll = {
    question: question.slice(0, 500),
    options: optStrings,
    votes: [],
    isActive: true,
  };
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/poll/vote', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const optionIndex = typeof body.optionIndex === 'number' ? body.optionIndex : -1;
  const room = await LiveRoom.findById(id);
  if (!room?.livePoll?.isActive) {
    res.status(400).json({
      success: false,
      message: 'No active poll',
      data: null,
    });
    return;
  }
  const opts = room.livePoll.options ?? [];
  if (optionIndex < 0 || optionIndex >= opts.length) {
    res.status(400).json({
      success: false,
      message: 'Invalid option',
      data: null,
    });
    return;
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const votes = room.livePoll.votes ?? [];
  const idx = votes.findIndex((v) => String(v.userId) === String(uid));
  if (idx >= 0) {
    votes[idx]!.optionIndex = optionIndex;
  } else {
    votes.push({ userId: uid, optionIndex });
  }
  room.livePoll.votes = votes;
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/poll/close', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || String(room.hostId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the host can close the poll',
      data: null,
    });
    return;
  }
  if (room.livePoll) {
    room.livePoll.isActive = false;
  }
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/validation-vote', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const score = typeof body.score === 'number' ? body.score : NaN;
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    res.status(400).json({
      success: false,
      message: 'score must be an integer 1–10',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || room.status !== 'live') {
    res.status(400).json({
      success: false,
      message: 'Validation voting only while live',
      data: null,
    });
    return;
  }
  const uid = new mongoose.Types.ObjectId(userId);
  const list = room.validationVotes ?? [];
  const idx = list.findIndex((v) => String(v.userId) === String(uid));
  if (idx >= 0) {
    list[idx]!.score = score;
  } else {
    list.push({ userId: uid, score });
  }
  room.validationVotes = list;
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});

liveRoomsRouter.post('/:id/reactions', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = res.locals.authUserId;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid room id',
      data: null,
    });
    return;
  }
  const body = req.body as Record<string, unknown>;
  const emoji = typeof body.emoji === 'string' ? body.emoji.trim() : '';
  if (!REACTION_EMOJIS.has(emoji)) {
    res.status(400).json({
      success: false,
      message: 'Invalid reaction',
      data: null,
    });
    return;
  }
  const room = await LiveRoom.findById(id);
  if (!room || room.status !== 'live') {
    res.status(400).json({
      success: false,
      message: 'Reactions only while live',
      data: null,
    });
    return;
  }
  const list = room.recentReactions ?? [];
  list.push({
    userId: new mongoose.Types.ObjectId(userId),
    emoji,
    createdAt: new Date(),
  });
  room.recentReactions = list.slice(-80);
  await room.save();
  const [payload] = await mapLiveRoomsToApi([room]);
  res.json({ success: true, message: 'OK', data: payload });
});
