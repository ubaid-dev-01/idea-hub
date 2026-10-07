import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type CoachSessionType =
  | 'idea_feedback'
  | 'daily_brief'
  | 'market_research'
  | 'pivot_advice';

export interface ICoachMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

export interface ICoachSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ideaId: Types.ObjectId | null;
  messages: ICoachMessage[];
  sessionType: CoachSessionType;
  createdAt: Date;
  updatedAt: Date;
}

export type ICoachSessionDocument = Document<
  Types.ObjectId,
  object,
  ICoachSession
> &
  ICoachSession;

export type ICoachSessionModel = Model<ICoachSession>;

const coachMessageSchema = new Schema<ICoachMessage>(
  {
    role: { type: String, enum: ['user', 'coach'], required: true },
    content: { type: String, required: true, maxlength: 16_000 },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const coachSessionSchema = new Schema<ICoachSession, ICoachSessionModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'Idea',
      default: null,
      index: true,
    },
    messages: { type: [coachMessageSchema], default: [] },
    sessionType: {
      type: String,
      enum: ['idea_feedback', 'daily_brief', 'market_research', 'pivot_advice'],
      default: 'market_research',
      index: true,
    },
  },
  { timestamps: true }
);

coachSessionSchema.index({ userId: 1, updatedAt: -1 });

export const CoachSession =
  (mongoose.models.CoachSession as ICoachSessionModel | undefined) ??
  mongoose.model<ICoachSession>('CoachSession', coachSessionSchema);
