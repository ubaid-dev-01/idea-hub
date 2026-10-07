import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface IIdeaCollectionItem {
  _id: Types.ObjectId;
  collectionId: Types.ObjectId;
  ideaId: Types.ObjectId;
  sortOrder: number;
  createdAt: Date;
}

export type IIdeaCollectionItemDocument = Document<
  Types.ObjectId,
  object,
  IIdeaCollectionItem
> &
  IIdeaCollectionItem;

export type IIdeaCollectionItemModel = Model<IIdeaCollectionItem>;

const ideaCollectionItemSchema = new Schema<
  IIdeaCollectionItem,
  IIdeaCollectionItemModel
>(
  {
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: 'IdeaCollection',
      required: true,
      index: true,
    },
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      index: true,
    },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ideaCollectionItemSchema.index({ collectionId: 1, ideaId: 1 }, { unique: true });
ideaCollectionItemSchema.index({ collectionId: 1, sortOrder: 1 });

export const IdeaCollectionItem =
  (mongoose.models.IdeaCollectionItem as IIdeaCollectionItemModel | undefined) ??
  mongoose.model<IIdeaCollectionItem>(
    'IdeaCollectionItem',
    ideaCollectionItemSchema
  );
