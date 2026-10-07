import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface IIdeaVersion {
  _id: Types.ObjectId;
  ideaId: Types.ObjectId;
  versionNumber: number;
  title: string;
  description: string;
  category: string;
  tags: string[];
  editedBy: Types.ObjectId;
  createdAt: Date;
}

export type IIdeaVersionDocument = Document<Types.ObjectId, object, IIdeaVersion> &
  IIdeaVersion;

export type IIdeaVersionModel = Model<IIdeaVersion>;

const ideaVersionSchema = new Schema<IIdeaVersion, IIdeaVersionModel>(
  {
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, maxlength: 500 },
    description: { type: String, required: true, maxlength: 50_000 },
    category: { type: String, required: true, default: 'other' },
    tags: { type: [String], default: [] },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ideaVersionSchema.index({ ideaId: 1, versionNumber: 1 }, { unique: true });

export const IdeaVersion =
  (mongoose.models.IdeaVersion as IIdeaVersionModel | undefined) ??
  mongoose.model<IIdeaVersion>('IdeaVersion', ideaVersionSchema);
