import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type LiveRoomQuestionStatus = 'queued' | 'answered' | 'dismissed';

export interface ILiveRoomQuestion {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  status: LiveRoomQuestionStatus;
  answeredAt?: Date;
  createdAt: Date;
}

export type ILiveRoomQuestionDocument = Document<
  Types.ObjectId,
  object,
  ILiveRoomQuestion
> &
  ILiveRoomQuestion;

export type ILiveRoomQuestionModel = Model<ILiveRoomQuestion>;

const liveRoomQuestionSchema = new Schema<
  ILiveRoomQuestion,
  ILiveRoomQuestionModel
>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'LiveRoom',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['queued', 'answered', 'dismissed'],
      default: 'queued',
      index: true,
    },
    answeredAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

liveRoomQuestionSchema.index({ roomId: 1, status: 1, createdAt: 1 });

export const LiveRoomQuestion =
  (mongoose.models.LiveRoomQuestion as ILiveRoomQuestionModel | undefined) ??
  mongoose.model<ILiveRoomQuestion>(
    'LiveRoomQuestion',
    liveRoomQuestionSchema
  );
