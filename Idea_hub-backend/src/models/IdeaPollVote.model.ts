import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type IdeaPollOptionKey =
  | 'yes_definitely'
  | 'maybe'
  | 'not_for_me'
  | 'already_exists';

export const IDEA_POLL_OPTION_KEYS: IdeaPollOptionKey[] = [
  'yes_definitely',
  'maybe',
  'not_for_me',
  'already_exists',
];

export function isPollOptionKey(s: string): s is IdeaPollOptionKey {
  return (IDEA_POLL_OPTION_KEYS as string[]).includes(s);
}

export interface IIdeaPollVote {
  _id: Types.ObjectId;
  ideaId: Types.ObjectId;
  userId: Types.ObjectId;
  optionKey: IdeaPollOptionKey;
  createdAt: Date;
}

export type IIdeaPollVoteDocument = Document<
  Types.ObjectId,
  object,
  IIdeaPollVote
> &
  IIdeaPollVote;

export type IIdeaPollVoteModel = Model<IIdeaPollVote>;

const ideaPollVoteSchema = new Schema<IIdeaPollVote, IIdeaPollVoteModel>(
  {
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    optionKey: {
      type: String,
      enum: IDEA_POLL_OPTION_KEYS,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ideaPollVoteSchema.index({ ideaId: 1, userId: 1 }, { unique: true });

export const IdeaPollVote =
  (mongoose.models.IdeaPollVote as IIdeaPollVoteModel | undefined) ??
  mongoose.model<IIdeaPollVote>('IdeaPollVote', ideaPollVoteSchema);
