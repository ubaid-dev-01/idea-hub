import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';
import { User } from './User.model.js';
import { modelEvents, type FollowCreatedPayload } from './modelEvents.js';

export interface IFollow {
  _id: Types.ObjectId;
  followerId: Types.ObjectId;
  followingId: Types.ObjectId;
  createdAt: Date;
}

export type IFollowDocument = Document<Types.ObjectId, object, IFollow> &
  IFollow;

export type IFollowModel = Model<IFollow>;

const followSchema = new Schema<IFollow, IFollowModel>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
followSchema.index({ followingId: 1, createdAt: -1 });
followSchema.index({ followerId: 1, createdAt: -1 });

followSchema.pre('save', function followInsertFlag(next) {
  if (this.followerId.equals(this.followingId)) {
    return next(new Error('Users cannot follow themselves'));
  }
  (this as IFollowDocument).$locals.justInserted = this.isNew;
  next();
});

followSchema.post('save', async function followPostSave(doc: IFollowDocument) {
  if (!doc.$locals.justInserted) return;
  await User.findByIdAndUpdate(doc.followerId, { $inc: { followingCount: 1 } });
  await User.findByIdAndUpdate(doc.followingId, { $inc: { followerCount: 1 } });
  const payload: FollowCreatedPayload = {
    followingId: doc.followingId.toString(),
  };
  setImmediate(() => {
    modelEvents.emit('follow:created', payload);
  });
});

async function decrementFollowCounts(
  followerId: Types.ObjectId,
  followingId: Types.ObjectId
) {
  await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
  await User.findByIdAndUpdate(followingId, { $inc: { followerCount: -1 } });
}

followSchema.post(
  'deleteOne',
  { document: true, query: false },
  async function followDocDeleteOne(this: IFollowDocument) {
    await decrementFollowCounts(this.followerId, this.followingId);
  }
);

followSchema.post('findOneAndDelete', async function followFindOneAndDelete(
  doc
) {
  if (doc?.followerId && doc?.followingId) {
    await decrementFollowCounts(doc.followerId, doc.followingId);
  }
});

export const Follow =
  (mongoose.models.Follow as IFollowModel | undefined) ??
  mongoose.model<IFollow>('Follow', followSchema);
