import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

const DOC_ID = new mongoose.Types.ObjectId('000000000000000000000001');

export interface ITrendingTagRow {
  tag: string;
  score: number;
}

export interface ITrendingTagsSnapshot {
  _id: Types.ObjectId;
  tags: ITrendingTagRow[];
  updatedAt: Date;
}

export type ITrendingTagsSnapshotDocument = Document<
  Types.ObjectId,
  object,
  ITrendingTagsSnapshot
> &
  ITrendingTagsSnapshot;

export type ITrendingTagsSnapshotModel = Model<ITrendingTagsSnapshot>;

const trendingTagsSnapshotSchema = new Schema<
  ITrendingTagsSnapshot,
  ITrendingTagsSnapshotModel
>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    tags: {
      type: [
        {
          tag: { type: String, required: true },
          score: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const TrendingTagsSnapshot =
  (mongoose.models.TrendingTagsSnapshot as ITrendingTagsSnapshotModel | undefined) ??
  mongoose.model<ITrendingTagsSnapshot>(
    'TrendingTagsSnapshot',
    trendingTagsSnapshotSchema
  );

export const TRENDING_TAGS_DOC_ID = DOC_ID;
