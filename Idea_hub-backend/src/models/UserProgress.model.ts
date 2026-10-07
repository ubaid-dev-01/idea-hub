import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface IUserProgressBadge {
  badgeId: string;
  earnedAt: Date;
  rarity: BadgeRarity;
}

export type ChallengeMetric =
  | 'ideas_posted'
  | 'comments_posted'
  | 'likes_given'
  | 'collabs_accepted'
  | 'validation_votes'
  | 'likes_received_on_ideas';

export interface IUserWeeklyChallenge {
  challengeId: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  target: number;
  progress: number;
  completed: boolean;
  weekOf: Date;
  category?: string;
}

export interface IUserProgress {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  totalXP: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  badges: IUserProgressBadge[];
  ideasPosted: number;
  collaborationsJoined: number;
  collabRequestsSent: number;
  ideasLiked: number;
  commentsPosted: number;
  validationVotesGiven: number;
  ideasTrendingCount: number;
  savedIdeasCount: number;
  challengesCompleted: number;
  /** ISO week bucket (UTC Monday date string YYYY-MM-DD) for weekly XP */
  weekBucket: string;
  weeklyXpEarned: number;
  weeklyChallenge: IUserWeeklyChallenge;
  createdAt: Date;
  updatedAt: Date;
}

export type IUserProgressDocument = Document<
  Types.ObjectId,
  object,
  IUserProgress
> &
  IUserProgress;

export type IUserProgressModel = Model<IUserProgress>;

const badgeSchema = new Schema<IUserProgressBadge>(
  {
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, required: true, default: () => new Date() },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      required: true,
    },
  },
  { _id: false }
);

const weeklyChallengeSchema = new Schema<IUserWeeklyChallenge>(
  {
    challengeId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    metric: {
      type: String,
      enum: [
        'ideas_posted',
        'comments_posted',
        'likes_given',
        'collabs_accepted',
        'validation_votes',
        'likes_received_on_ideas',
      ],
      required: true,
    },
    target: { type: Number, required: true, min: 1 },
    progress: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
    weekOf: { type: Date, required: true },
    category: { type: String, trim: true },
  },
  { _id: false }
);

const userProgressSchema = new Schema<IUserProgress, IUserProgressModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    totalXP: { type: Number, default: 0, min: 0 },
    level: { type: Number, default: 1, min: 1, max: 50 },
    levelTitle: { type: String, default: 'Idea Spark' },
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    lastActiveDate: { type: Date, default: null },
    badges: { type: [badgeSchema], default: [] },
    ideasPosted: { type: Number, default: 0, min: 0 },
    collaborationsJoined: { type: Number, default: 0, min: 0 },
    collabRequestsSent: { type: Number, default: 0, min: 0 },
    ideasLiked: { type: Number, default: 0, min: 0 },
    commentsPosted: { type: Number, default: 0, min: 0 },
    validationVotesGiven: { type: Number, default: 0, min: 0 },
    ideasTrendingCount: { type: Number, default: 0, min: 0 },
    savedIdeasCount: { type: Number, default: 0, min: 0 },
    challengesCompleted: { type: Number, default: 0, min: 0 },
    weekBucket: { type: String, default: '', index: true },
    weeklyXpEarned: { type: Number, default: 0, min: 0 },
    weeklyChallenge: { type: weeklyChallengeSchema, required: false },
  },
  { timestamps: true }
);

userProgressSchema.index({ weekBucket: 1, weeklyXpEarned: -1 });

export const UserProgress =
  (mongoose.models.UserProgress as IUserProgressModel | undefined) ??
  mongoose.model<IUserProgress>('UserProgress', userProgressSchema);
