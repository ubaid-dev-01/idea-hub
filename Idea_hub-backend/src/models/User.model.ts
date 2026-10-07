import bcrypt from 'bcryptjs';
import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

const SALT_ROUNDS = 12;

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$/;

export type UserRole = 'user' | 'collaborator' | 'moderator' | 'super_admin';

export type UserStatus =
  | 'active'
  | 'inactive'
  | 'banned'
  | 'pending_verification';

export type EmailDigestFrequency = 'none' | 'daily' | 'weekly';

export type SubscriptionPlan = 'free' | 'pro' | 'investor';

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface IUserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd: Date | null;
}

export interface IUserInterestProfile {
  categoryWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  lastUpdated: Date;
}

export interface IUserNotificationPreferences {
  likes: boolean;
  comments: boolean;
  collabRequests: boolean;
  newFollower: boolean;
  trendingIdeas: boolean;
  /** Notify when someone you follow publishes a new version of an idea */
  ideaVersionUpdates: boolean;
  emailDigest: EmailDigestFrequency;
  pushEnabled: boolean;
}

/** Plain object shape for `.lean<IUser>()` and API typing */
export interface IUser {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  skills: string[];
  interestProfile: IUserInterestProfile;
  notificationPreferences: IUserNotificationPreferences;
  /** Manual admin verification (notable innovators) */
  verifiedInnovator: boolean;
  verificationRequestAt: Date | null;
  verificationRequestMessage: string;
  subscription: IUserSubscription;
  fcmToken: string;
  followerCount: number;
  followingCount: number;
  totalIdeasPosted: number;
  lastSeenAt: Date;
  emailVerificationToken: string;
  passwordResetToken: string;
  passwordResetExpires: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type IUserDocument = Document<Types.ObjectId, object, IUser> &
  IUser &
  IUserMethods;

export interface IUserModel extends Model<IUser, object, IUserMethods> {
  findByEmail(email: string): Promise<IUserDocument | null>;
}

const interestProfileSchema = new Schema<IUserInterestProfile>(
  {
    categoryWeights: {
      type: Schema.Types.Mixed,
      default: () => ({} as Record<string, number>),
    },
    tagWeights: {
      type: Schema.Types.Mixed,
      default: () => ({} as Record<string, number>),
    },
    lastUpdated: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const userSubscriptionSchema = new Schema(
  {
    plan: {
      type: String,
      enum: ['free', 'pro', 'investor'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
    stripeCustomerId: { type: String, default: '', trim: true },
    stripeSubscriptionId: { type: String, default: '', trim: true },
    currentPeriodEnd: { type: Date, default: null },
  },
  { _id: false }
);

const notificationPreferencesSchema = new Schema<IUserNotificationPreferences>(
  {
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    collabRequests: { type: Boolean, default: true },
    newFollower: { type: Boolean, default: true },
    trendingIdeas: { type: Boolean, default: true },
    ideaVersionUpdates: { type: Boolean, default: true },
    emailDigest: {
      type: String,
      enum: ['none', 'daily', 'weekly'],
      default: 'none',
    },
    pushEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUser, IUserModel, IUserMethods>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]{1,2}$/,
        'Username must be lowercase alphanumeric with optional _ or - (no spaces)',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email is too long'],
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
      // Validators run before `pre('save')` hashing: allow plain passwords (min 8) or stored bcrypt.
      validate: {
        validator(v: string) {
          if (BCRYPT_HASH_REGEX.test(v)) return v.length >= 60;
          return v.length >= 8 && v.length <= 256;
        },
        message: 'Password must be at least 8 characters',
      },
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [120, 'Full name cannot exceed 120 characters'],
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      trim: true,
    },
    avatarUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2048, 'Avatar URL is too long'],
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'collaborator', 'moderator', 'super_admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'user',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'banned', 'pending_verification'],
        message: '{VALUE} is not a valid status',
      },
      default: 'pending_verification',
    },
    isEmailVerified: { type: Boolean, default: false },
    skills: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length <= 20,
        message: 'Cannot have more than 20 skills',
      },
      default: [],
    },
    interestProfile: {
      type: interestProfileSchema,
      default: () =>
        ({
          categoryWeights: {},
          tagWeights: {},
          lastUpdated: new Date(),
        }) satisfies IUserInterestProfile,
    },
    notificationPreferences: {
      type: notificationPreferencesSchema,
      default: () => ({}),
    },
    verifiedInnovator: { type: Boolean, default: false },
    verificationRequestAt: { type: Date, default: null },
    verificationRequestMessage: {
      type: String,
      default: '',
      maxlength: 2000,
      trim: true,
    },
    subscription: {
      type: userSubscriptionSchema,
      default: () => ({
        plan: 'free' as const,
        status: 'active' as const,
        stripeCustomerId: '',
        stripeSubscriptionId: '',
        currentPeriodEnd: null,
      }),
    },
    fcmToken: { type: String, default: '', trim: true },
    followerCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    totalIdeasPosted: { type: Number, default: 0, min: 0 },
    lastSeenAt: { type: Date, default: () => new Date() },
    emailVerificationToken: { type: String, default: '', select: false },
    passwordResetToken: { type: String, default: '', select: false },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        const o = ret as Record<string, unknown>;
        delete o.passwordHash;
        delete o.__v;
        return o;
      },
    },
    toObject: { virtuals: true },
  }
);

// email + username: unique indexes come from `unique: true` on those paths — do not duplicate with schema.index().
userSchema.index({ status: 1, role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index(
  { 'subscription.stripeCustomerId': 1 },
  { sparse: true }
);

userSchema.virtual('profileUrl').get(function profileUrlGetter(this: IUserDocument) {
  return `/profile/${this.username}`;
});

userSchema.pre('save', async function hashPasswordPreSave(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const hash = this.get('passwordHash') as string;
  if (BCRYPT_HASH_REGEX.test(hash)) {
    return next();
  }
  this.set('passwordHash', await bcrypt.hash(hash, SALT_ROUNDS));
  next();
});

userSchema.methods.comparePassword = async function comparePassword(
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.findByEmail = function findByEmail(
  this: IUserModel,
  email: string
) {
  return this.findOne({ email: email.trim().toLowerCase() }).select(
    '+passwordHash'
  );
};

export const User =
  (mongoose.models.User as IUserModel | undefined) ??
  mongoose.model<IUser, IUserModel>('User', userSchema);
