import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface ICollectionFollow {
  _id: Types.ObjectId;
  followerId: Types.ObjectId;
  collectionId: Types.ObjectId;
  createdAt: Date;
}

export type ICollectionFollowDocument = Document<
  Types.ObjectId,
  object,
  ICollectionFollow
> &
  ICollectionFollow;

export type ICollectionFollowModel = Model<ICollectionFollow>;

const collectionFollowSchema = new Schema<ICollectionFollow, ICollectionFollowModel>(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: 'IdeaCollection',
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

collectionFollowSchema.index({ followerId: 1, collectionId: 1 }, { unique: true });

export const CollectionFollow =
  (mongoose.models.CollectionFollow as ICollectionFollowModel | undefined) ??
  mongoose.model<ICollectionFollow>('CollectionFollow', collectionFollowSchema);
