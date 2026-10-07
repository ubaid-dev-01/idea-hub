import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface ILiveRoomMessage {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  body: string;
  createdAt: Date;
}

export type ILiveRoomMessageDocument = Document<
  Types.ObjectId,
  object,
  ILiveRoomMessage
> &
  ILiveRoomMessage;

export type ILiveRoomMessageModel = Model<ILiveRoomMessage>;

const liveRoomMessageSchema = new Schema<
  ILiveRoomMessage,
  ILiveRoomMessageModel
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

liveRoomMessageSchema.index({ roomId: 1, createdAt: -1 });

export const LiveRoomMessage =
  (mongoose.models.LiveRoomMessage as ILiveRoomMessageModel | undefined) ??
  mongoose.model<ILiveRoomMessage>(
    'LiveRoomMessage',
    liveRoomMessageSchema
  );
