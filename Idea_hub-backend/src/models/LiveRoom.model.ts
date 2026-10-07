import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

import { LIVE_FREE_MAX_PARTICIPANTS } from '../config/live.config.js';

export type LiveRoomStatus = 'scheduled' | 'live' | 'ended';

export type LiveRoomParticipantRole =
  | 'host'
  | 'speaker'
  | 'listener'
  | 'pending_speaker';

export interface ILiveRoomParticipant {
  userId: Types.ObjectId;
  role: LiveRoomParticipantRole;
  joinedAt: Date;
  leftAt?: Date;
}

export interface ILiveRoomPollVote {
  userId: Types.ObjectId;
  optionIndex: number;
}

export interface ILiveRoomPoll {
  question: string;
  options: string[];
  votes: ILiveRoomPollVote[];
  isActive: boolean;
}

export interface ILiveRoomValidationVote {
  userId: Types.ObjectId;
  score: number;
}

export interface ILiveRoomReaction {
  userId: Types.ObjectId;
  emoji: string;
  createdAt: Date;
}

export interface ILiveRoom {
  _id: Types.ObjectId;
  ideaId: Types.ObjectId | null;
  hostId: Types.ObjectId;
  title: string;
  description: string;
  status: LiveRoomStatus;
  scheduledFor: Date;
  startedAt?: Date;
  endedAt?: Date;
  /** Daily room name or mock id */
  providerRoomName: string;
  provider: 'daily' | 'mock';
  maxParticipants: number;
  participants: ILiveRoomParticipant[];
  peakListeners: number;
  totalJoined: number;
  recordingUrl: string;
  isRecorded: boolean;
  livePoll?: ILiveRoomPoll;
  validationVotes: ILiveRoomValidationVote[];
  recentReactions: ILiveRoomReaction[];
  tags: string[];
  category: string;
  rsvpReminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ILiveRoomDocument = Document<Types.ObjectId, object, ILiveRoom> &
  ILiveRoom;

export type ILiveRoomModel = Model<ILiveRoom>;

const participantSchema = new Schema<ILiveRoomParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['host', 'speaker', 'listener', 'pending_speaker'],
      required: true,
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
  },
  { _id: false }
);

const validationVoteSchema = new Schema<ILiveRoomValidationVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, required: true, min: 1, max: 10 },
  },
  { _id: false }
);

const reactionSchema = new Schema<ILiveRoomReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true, maxlength: 8 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pollVoteSchema = new Schema<ILiveRoomPollVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    optionIndex: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const livePollSchema = new Schema<ILiveRoomPoll>(
  {
    question: { type: String, required: true, maxlength: 500 },
    options: {
      type: [String],
      required: true,
      validate: [
        (v: string[]) => Array.isArray(v) && v.length >= 2 && v.length <= 8,
        'Poll needs 2–8 options',
      ],
    },
    votes: { type: [pollVoteSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const liveRoomSchema = new Schema<ILiveRoom, ILiveRoomModel>(
  {
    ideaId: { type: Schema.Types.ObjectId, ref: 'Idea', default: null, index: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended'],
      default: 'scheduled',
      index: true,
    },
    scheduledFor: { type: Date, required: true, index: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
    providerRoomName: { type: String, required: true, trim: true },
    provider: { type: String, enum: ['daily', 'mock'], required: true },
    maxParticipants: {
      type: Number,
      default: LIVE_FREE_MAX_PARTICIPANTS,
      min: 2,
    },
    participants: { type: [participantSchema], default: [] },
    peakListeners: { type: Number, default: 0, min: 0 },
    totalJoined: { type: Number, default: 0, min: 0 },
    recordingUrl: { type: String, default: '', maxlength: 2000 },
    isRecorded: { type: Boolean, default: false },
    livePoll: { type: livePollSchema, required: false },
    validationVotes: { type: [validationVoteSchema], default: [] },
    recentReactions: { type: [reactionSchema], default: [] },
    tags: { type: [String], default: [], maxlength: 20 },
    category: { type: String, default: 'other', trim: true, maxlength: 40 },
    rsvpReminderSentAt: { type: Date },
  },
  { timestamps: true }
);

liveRoomSchema.index({ status: 1, scheduledFor: 1 });
liveRoomSchema.index({ status: 1, 'participants.userId': 1 });

export const LiveRoom =
  (mongoose.models.LiveRoom as ILiveRoomModel | undefined) ??
  mongoose.model<ILiveRoom>('LiveRoom', liveRoomSchema);
