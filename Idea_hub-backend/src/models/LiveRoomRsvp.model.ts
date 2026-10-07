import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface ILiveRoomRsvp {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

export type ILiveRoomRsvpDocument = Document<
  Types.ObjectId,
  object,
  ILiveRoomRsvp
> &
  ILiveRoomRsvp;

export type ILiveRoomRsvpModel = Model<ILiveRoomRsvp>;

const liveRoomRsvpSchema = new Schema<ILiveRoomRsvp, ILiveRoomRsvpModel>(
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
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

liveRoomRsvpSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export const LiveRoomRsvp =
  (mongoose.models.LiveRoomRsvp as ILiveRoomRsvpModel | undefined) ??
  mongoose.model<ILiveRoomRsvp>('LiveRoomRsvp', liveRoomRsvpSchema);
