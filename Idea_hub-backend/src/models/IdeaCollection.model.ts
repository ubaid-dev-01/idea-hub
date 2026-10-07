import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';
import shortid from 'shortid';
import slugifyModule from 'slugify';

const slugify = slugifyModule as unknown as (
  str: string,
  options?: { lower?: boolean; strict?: boolean; trim?: boolean }
) => string;

export interface IIdeaCollection {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  description: string;
  slug: string;
  isPublic: boolean;
  followerCount: number;
  ideaCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IIdeaCollectionDocument = Document<
  Types.ObjectId,
  object,
  IIdeaCollection
> &
  IIdeaCollection;

export type IIdeaCollectionModel = Model<IIdeaCollection>;

async function uniqueCollectionSlug(
  name: string,
  ownerId: Types.ObjectId,
  excludeId?: Types.ObjectId
): Promise<string> {
  const Model = mongoose.model<IIdeaCollection>('IdeaCollection');
  const base = slugify(name, { lower: true, strict: true, trim: true }) || 'collection';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate =
      attempt === 0 ? `${base}-${shortid.generate()}` : `${base}-${shortid.generate()}`;
    const exists = await Model.exists({
      ownerId,
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

const ideaCollectionSchema = new Schema<IIdeaCollection, IIdeaCollectionModel>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: { type: String, default: '', maxlength: 2000, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    isPublic: { type: Boolean, default: true },
    followerCount: { type: Number, default: 0, min: 0 },
    ideaCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ideaCollectionSchema.index({ ownerId: 1, slug: 1 }, { unique: true });
ideaCollectionSchema.index({ ownerId: 1, createdAt: -1 });

ideaCollectionSchema.pre('validate', async function collectionSlugPre(next) {
  if (!this.isNew) {
    return next();
  }
  try {
    const slug = await uniqueCollectionSlug(
      this.name,
      this.ownerId as Types.ObjectId,
      this._id as Types.ObjectId
    );
    this.set('slug', slug);
    next();
  } catch (e) {
    next(e as Error);
  }
});

export const IdeaCollection =
  (mongoose.models.IdeaCollection as IIdeaCollectionModel | undefined) ??
  mongoose.model<IIdeaCollection>('IdeaCollection', ideaCollectionSchema);
