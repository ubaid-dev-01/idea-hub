import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type StoryMediaType = 'image' | 'video';

export interface IStory {
  _id: Types.ObjectId;
  authorId: Types.ObjectId;
  mediaUrl: string;
  thumbnailUrl: string;
  mediaType: StoryMediaType;
  caption: string;
  /** Auto-removed by MongoDB TTL when this time is reached (created + 24h). */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IStoryDocument = Document<Types.ObjectId, object, IStory> & IStory;
export type IStoryModel = Model<IStory>;

const STORY_TTL_SEC = 24 * 60 * 60;

const storySchema = new Schema<IStory, IStoryModel>(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaUrl: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: '', trim: true },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    caption: { type: String, default: '', trim: true, maxlength: 200 },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

/** Mongo deletes the document once expiresAt is in the past. */
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ authorId: 1, createdAt: -1 });

export const Story: IStoryModel =
  (mongoose.models.Story as IStoryModel | undefined) ??
  mongoose.model<IStory, IStoryModel>('Story', storySchema);

export const STORY_LIFETIME_MS = STORY_TTL_SEC * 1000;
