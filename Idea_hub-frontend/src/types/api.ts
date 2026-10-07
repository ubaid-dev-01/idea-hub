export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  errors?: string[];
  meta?: {
    nextCursor?: string;
    hasMore?: boolean;
    total?: number;
  };
}

export type UserRole =
  | 'user'
  | 'collaborator'
  | 'moderator'
  | 'super_admin';

export type UserStatus =
  | 'active'
  | 'inactive'
  | 'banned'
  | 'pending_verification';

export interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  collabRequests: boolean;
  newFollower: boolean;
  trendingIdeas: boolean;
  ideaVersionUpdates?: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
  pushEnabled: boolean;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Shown on idea cards when API attaches progress to populated author */
export interface IUserGamification {
  level: number;
  levelTitle: string;
  levelEmoji: string;
  totalXP: number;
}

export type SubscriptionPlan = 'free' | 'pro' | 'investor';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export interface IUserSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface IUser {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  skills: string[];
  followerCount: number;
  followingCount: number;
  totalIdeasPosted: number;
  notificationPreferences: NotificationPreferences;
  verifiedInnovator?: boolean;
  verificationRequestAt?: string | null;
  verificationRequestMessage?: string;
  subscription?: IUserSubscription;
  /** Present on public profile when viewer is logged in; whether viewer follows this user. */
  isFollowing?: boolean;
  createdAt: string;
  gamification?: IUserGamification;
}

export interface IUserProgressWeeklyChallenge {
  challengeId: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  progress: number;
  completed: boolean;
  weekOf: string;
  category?: string;
}

export interface IUserProgressBadge {
  badgeId: string;
  earnedAt: string;
  rarity: BadgeRarity;
}

export interface IUserProgress {
  userId: string;
  totalXP: number;
  level: number;
  levelTitle: string;
  levelEmoji: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
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
  weekBucket: string;
  weeklyXpEarned: number;
  weeklyChallenge: IUserProgressWeeklyChallenge | null;
  xpIntoLevel: number;
  xpToNext: number;
}

export interface IBadgeDefinition {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
}

export interface ILeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
  weeklyXpEarned: number;
  level: number;
  levelTitle: string;
}

export interface ILeaderboardPayload {
  weekBucket: string;
  scope: string;
  rows: ILeaderboardRow[];
  myRank: number | null;
  myRow: ILeaderboardRow | null;
}

export type MediaType =
  | 'image'
  | 'video'
  | 'pdf'
  | 'doc'
  | 'audio'
  | 'link';

export type MediaScanStatus =
  | 'pending'
  | 'scanning'
  | 'approved'
  | 'rejected';

export interface IMedia {
  _id: string;
  mediaType: MediaType;
  /** Legacy Firebase Storage URL */
  firebaseUrl: string;
  /** Cloudinary (or other CDN) delivery URL */
  cdnUrl: string;
  /** Cloudinary public_id for delete/transform */
  publicId: string;
  thumbnailUrl: string;
  mimeType: string;
  scanStatus: MediaScanStatus;
  scanViolations: string[];
  fileSizeBytes?: number;
  durationSeconds?: number;
  uploadedAt?: string;
}

export type IdeaCategory =
  | 'tech'
  | 'health'
  | 'education'
  | 'environment'
  | 'finance'
  | 'social'
  | 'art'
  | 'other';

export type IdeaStatus =
  | 'draft'
  | 'pending_review'
  | 'ai_scanning'
  | 'published'
  | 'rejected'
  | 'archived'
  | 'flagged';

export type IdeaVisibility = 'public' | 'private' | 'collaborators_only';

export type IdeaValidationTrend = 'rising' | 'stable' | 'falling';

export interface IIdeaValidationScore {
  total: number;
  communityVotes: number;
  collaboratorWant: number;
  aiMarketScore: number;
  uniquenessScore: number;
  completenessScore: number;
  lastCalculated: string;
  trend: IdeaValidationTrend;
  breakdown: {
    marketSize: 'small' | 'medium' | 'large' | 'massive';
    competition: 'low' | 'medium' | 'high';
    feasibility: 'hard' | 'medium' | 'easy';
    timing: 'too_early' | 'perfect' | 'too_late';
  };
  insights: {
    strengths: string[];
    risks: string[];
    suggestedPivots: string[];
  };
}

/** API may return populated author or id string */
export type AuthorRef = IUser | string;

export interface IIdeaCoachImprovement {
  issue: string;
  fix: string;
  xpReward: number;
}

export interface IIdeaAiCoachFeedback {
  overallFeedback: string;
  strengths: string[];
  improvements: IIdeaCoachImprovement[];
  marketInsight: string;
  nextStep: string;
  generatedAt: string;
}

export interface IDailyBriefPayload {
  greeting: string;
  summaryLines: string[];
  todayChallenge: {
    title: string;
    description: string;
    xpReward: number;
  };
  trendingInsight: string;
  motivationalMessage: string;
  briefDay: string;
  generatedAt: string;
}

export type IdeaPollOptionKey =
  | 'yes_definitely'
  | 'maybe'
  | 'not_for_me'
  | 'already_exists';

export interface IIdeaPollState {
  enabled: boolean;
  question: string;
  counts: Record<IdeaPollOptionKey, number>;
  myVote?: IdeaPollOptionKey | null;
}

export interface IIdea {
  _id: string;
  authorId: AuthorRef;
  title: string;
  description: string;
  slug: string;
  category: IdeaCategory | string;
  tags: string[];
  status: IdeaStatus;
  visibility: IdeaVisibility;
  version?: number;
  parentIdeaId?: string;
  isDuetResponse?: boolean;
  poll?: IIdeaPollState;
  media: IMedia[];
  collaboratorsOpen: boolean;
  requiredSkills: string[];
  collaborators: Array<{
    userId: AuthorRef;
    role: string;
    joinedAt: string;
  }>;
  likeCount: number;
  viewCount: number;
  shareCount: number;
  commentCount: number;
  trendingScore: number;
  isFeatured: boolean;
  featuredAt?: string;
  location?: string;
  aiSummary?: string;
  aiSuggestedTags?: string[];
  contentScanScore: number;
  validationScore?: IIdeaValidationScore;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  /** Set by API when viewer is authenticated */
  liked?: boolean;
  saved?: boolean;
  /** Author-only: structured AI coach feedback */
  aiCoachFeedback?: IIdeaAiCoachFeedback;
}

export interface ILiveRoomParticipantRow {
  userId: string;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  user: IUser | null;
}

export interface ILiveRoomPollState {
  question: string;
  options: string[];
  tallies: number[];
  isActive: boolean;
}

export interface ILiveRoom {
  _id: string;
  ideaId: string | null;
  hostId: string;
  title: string;
  description: string;
  status: 'scheduled' | 'live' | 'ended';
  scheduledFor: string;
  startedAt: string | null;
  endedAt: string | null;
  provider: string;
  providerRoomName: string;
  maxParticipants: number;
  participants: ILiveRoomParticipantRow[];
  peakListeners: number;
  totalJoined: number;
  recordingUrl: string;
  isRecorded: boolean;
  livePoll: ILiveRoomPollState | null;
  validation: { average: number | null; count: number };
  recentReactions: Array<{
    userId: string;
    emoji: string;
    createdAt: string;
    user: IUser | null;
  }>;
  tags: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  /** Present on GET /live-rooms/:id when authenticated */
  hasRsvp?: boolean;
}

export interface ILiveRoomMessage {
  _id: string;
  roomId: string;
  userId: string;
  body: string;
  createdAt: string;
  user: IUser | null;
}

export interface ILiveRoomQuestion {
  _id: string;
  roomId: string;
  userId: string;
  body: string;
  status: string;
  answeredAt: string | null;
  createdAt: string;
  user: IUser | null;
}

export interface INotification {
  _id: string;
  recipientId?: string;
  senderId?: IUser;
  type: string;
  referenceId: string;
  referenceType: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SearchParams {
  q?: string;
  category?: string;
  tags?: string;
  hasMedia?: boolean;
  collaboratorsOpen?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'recent' | 'trending' | 'likes';
  cursor?: string;
}

export interface UpdateIdeaDto {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  visibility?: IdeaVisibility;
  collaboratorsOpen?: boolean;
  requiredSkills?: string[];
  location?: string;
}

export interface CreateIdeaPayload {
  title: string;
  description: string;
  category: IdeaCategory;
  tags: string[];
  visibility: IdeaVisibility;
  collaboratorsOpen: boolean;
  requiredSkills: string[];
  location?: string;
  /** Duet: respond to another user's published idea (must stay public) */
  parentIdeaId?: string;
  isDuetResponse?: boolean;
  media: Array<{
    cdnUrl: string;
    publicId?: string;
    /** Legacy uploads only */
    firebaseUrl?: string;
    mimeType: string;
    mediaType: MediaType;
    thumbnailUrl?: string;
    fileSizeBytes?: number;
  }>;
}

export interface CollabRequestDto {
  message: string;
  skillsOffered: string[];
}

export interface IComment {
  _id: string;
  ideaId: string;
  authorId: IUser;
  parentCommentId: string | null;
  content: string;
  likeCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  replies?: IComment[];
}

export interface ICollabRequest {
  _id: string;
  ideaId: string;
  requesterId: IUser;
  message: string;
  skillsOffered: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  responseMessage?: string;
  respondedAt?: string;
  createdAt: string;
}

export type MarketplaceListingTypeApi =
  | 'full_rights'
  | 'license'
  | 'co_founder'
  | 'investor_pitch';

export type MarketplaceListingStatusApi =
  | 'draft'
  | 'active'
  | 'under_negotiation'
  | 'sold'
  | 'withdrawn';

export interface IIdeaListingPreview {
  _id: string;
  title: string;
  category: string;
  thumbnailUrl: string;
  validationScore?: IIdeaValidationScore;
}

export interface IMarketplaceBidRow {
  _id: string;
  bidderId: string;
  amount: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string | null;
  bidder?: IUser;
}

export interface IMarketplaceListing {
  _id: string;
  ideaId: string;
  sellerId: string;
  listingType: MarketplaceListingTypeApi;
  askingPrice: number;
  equity: number;
  status: MarketplaceListingStatusApi;
  description: string;
  proofPoints: string[];
  targetBuyer: string;
  views: number;
  interestedCount: number;
  bidCount: number;
  bids: IMarketplaceBidRow[];
  soldTo: string | null;
  soldPrice: number | null;
  soldAt: string | null;
  platformFeeUsd: number | null;
  netToSellerUsd: number | null;
  expiresAt: string | null;
  featuredUntil: string | null;
  isFeatured: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  idea: IIdeaListingPreview | null;
  seller: IUser | null;
}

export interface IMarketplaceSaleRow {
  listingId: string;
  ideaId: string;
  soldTo: string | null;
  soldPrice: number | null;
  platformFeeUsd: number | null;
  netToSellerUsd: number | null;
  soldAt: string | null;
}

export interface IMarketplaceEarnings {
  sales: IMarketplaceSaleRow[];
  totals: {
    grossUsd: number;
    platformFeesUsd: number;
    netToSellerUsd: number;
  };
  subscriptionPricesUsd: Record<string, number>;
}

export interface AdminUserParams {
  cursor?: string;
  role?: UserRole;
  status?: UserStatus;
  from?: string;
  to?: string;
}

export interface AdminIdeaParams {
  cursor?: string;
  status?: IdeaStatus;
  minScore?: number;
  maxScore?: number;
}

export interface AuditLogParams {
  cursor?: string;
  adminId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
}

/** Full payload from GET /admin/dashboard/stats */
export interface AdminDashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalIdeas: number;
    publishedIdeas: number;
    totalLikes: number;
    totalCollabs: number;
  };
  trends: {
    usersPct: number;
    ideasPct: number;
    signupsTodayPct: number;
    queuePct: number;
  };
  today: {
    newUsers: number;
    newIdeas: number;
    newLikes: number;
    scanJobsRan: number;
  };
  scanQueue: {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
    avgScore: number;
  };
  topIdeas: IIdea[];
  recentUsers: IUser[];
  categoryBreakdown: Record<string, number>;
  weeklyActivity: Array<{ date: string; ideas: number; users: number }>;
  legacy: {
    dau: number;
    mau: number;
    ideasTrend: Array<{ label: string; value: number }>;
    categoryDistribution: Array<{ name: string; value: number }>;
    engagementBuckets: Array<{ name: string; value: number }>;
    rejectionRate: number;
  };
  kpis: {
    totalIdeas: number;
    activeProjects: number;
    totalUsers: number;
    publishedIdeas: number;
  };
  ideasTrend6Months: Array<{ label: string; value: number }>;
  ideasByStatus: Record<string, number>;
  monthlyGrowth: {
    ideasPct: number;
    usersPct: number;
  };
  recentIdeasFeed: IIdea[];
  topContributors: Array<{
    userId: string;
    username: string;
    fullName: string;
    ideasCount: number;
    votesReceived: number;
  }>;
  pendingApprovals: IIdea[];
  comments: {
    total: number;
    flagged: number;
  };
}

/** Admin comment moderation list item */
export interface IAdminComment {
  _id: string;
  ideaId: string;
  ideaTitle: string;
  author: IUser | null;
  content: string;
  status: string;
  likeCount: number;
  createdAt: string;
}

/** Alias for older imports */
export type AdminStats = AdminDashboardStats;

/** GET /users/me/dashboard */
export interface UserMeDashboard {
  profile: IUser;
  stats: {
    totalIdeas: number;
    totalLikes: number;
    totalViews: number;
    totalComments: number;
    totalCollaborators: number;
    totalFollowers: number;
  };
  ideas: {
    published: number;
    draft: number;
    pending: number;
    rejected: number;
    topIdea: IIdea | null;
  };
  recentActivity: Array<{
    type: 'like' | 'comment' | 'collab' | 'follow';
    from: IUser;
    idea?: IIdea;
    createdAt: string;
  }>;
  weeklyViews: Array<{ date: string; views: number }>;
  collaborations: Array<{
    idea: IIdea;
    role: string;
    status: string;
  }>;
  pendingCollabRequests: Array<{
    idea: IIdea;
    status: string;
    createdAt: string;
  }>;
}

/** GET /users/me/collaborations */
export interface UserCollaborationsPageData {
  accepted: Array<{
    idea: IIdea;
    role: string;
    status: string;
    acceptedAt: string;
  }>;
  pending: Array<{
    idea: IIdea;
    status: string;
    createdAt: string;
  }>;
}

export interface IAdminAuditLog {
  _id: string;
  adminId: AuthorRef;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
}

export interface ScanQueueIdea extends IIdea {
  authorId: IUser;
  contentScanReport?: {
    textScore: number;
    imageScore: number;
    videoScore: number;
    docScore: number;
    violations: string[];
    reviewRequired: boolean;
    scannedAt: string;
  };
}
