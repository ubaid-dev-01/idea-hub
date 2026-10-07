import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';
import { Idea } from './Idea.model.js';
import {
  modelEvents,
  type LikeCreatedPayload,
  type LikeRemovedPayload,
} from './modelEvents.js';

export interface ILike {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ideaId: Types.ObjectId;
  createdAt: Date;
}

export type ILikeDocument = Document<Types.ObjectId, object, ILike> & ILike;

export type ILikeModel = Model<ILike>;

const likeSchema = new Schema<ILike, ILikeModel>(
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
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

likeSchema.index({ userId: 1, ideaId: 1 }, { unique: true });
likeSchema.index({ ideaId: 1, createdAt: -1 });
likeSchema.index({ userId: 1, createdAt: -1 });

likeSchema.pre('save', function markInsertFlag(next) {
  (this as ILikeDocument).$locals.justInserted = this.isNew;
  next();
});

likeSchema.post('save', async function likePostSave(doc: ILikeDocument) {
  if (!doc.$locals.justInserted) return;
  await Idea.findByIdAndUpdate(doc.ideaId, { $inc: { likeCount: 1 } });
  const payload: LikeCreatedPayload = {
    likeId: doc._id.toString(),
    userId: doc.userId.toString(),
    ideaId: doc.ideaId.toString(),
  };
  setImmediate(() => {
    modelEvents.emit('like:created', payload);
  });
});

async function decrementIdeaLikeCount(ideaId: Types.ObjectId) {
  await Idea.findByIdAndUpdate(ideaId, { $inc: { likeCount: -1 } });
}

likeSchema.post(
  'deleteOne',
  { document: true, query: false },
  async function likeDocDeleteOne(this: ILikeDocument) {
    await decrementIdeaLikeCount(this.ideaId);
  }
);

likeSchema.post('findOneAndDelete', async function likeFindOneAndDelete(doc) {
  if (doc?.ideaId) {
    await decrementIdeaLikeCount(doc.ideaId);
    const payload: LikeRemovedPayload = { ideaId: doc.ideaId.toString() };
    setImmediate(() => {
      modelEvents.emit('like:removed', payload);
    });
  }
});

export const Like =
  (mongoose.models.Like as ILikeModel | undefined) ??
  mongoose.model<ILike>('Like', likeSchema);
