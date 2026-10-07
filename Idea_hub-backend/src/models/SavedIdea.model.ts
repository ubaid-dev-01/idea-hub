import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface ISavedIdea {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  ideaId: Types.ObjectId;
  createdAt: Date;
}

export type ISavedIdeaDocument = Document<Types.ObjectId, object, ISavedIdea> &
  ISavedIdea;

export type ISavedIdeaModel = Model<ISavedIdea>;

const savedIdeaSchema = new Schema<ISavedIdea, ISavedIdeaModel>(
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
  { timestamps: { createdAt: true, updatedAt: false } }
);

savedIdeaSchema.index({ userId: 1, ideaId: 1 }, { unique: true });
savedIdeaSchema.index({ userId: 1, _id: -1 });

export const SavedIdea =
  (mongoose.models.SavedIdea as ISavedIdeaModel | undefined) ??
  mongoose.model<ISavedIdea>('SavedIdea', savedIdeaSchema);
