import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'collab_request'
  | 'collab_accepted'
  | 'new_idea_from_followed'
  | 'idea_trending'
  | 'mention'
  | 'idea_updated'
  | 'idea_version_updated'
  | 'system_message'
  | 'admin_action'
  | 'marketplace_bid'
  | 'marketplace_interest'
  | 'marketplace_bid_accepted'
  | 'marketplace_bid_rejected'
  | 'live_room_started'
  | 'live_room_reminder'
  | 'ai_coach_daily_brief';

export type NotificationReferenceType =
  | 'idea'
  | 'comment'
  | 'user'
  | 'collab_request'
  | 'marketplace_listing'
  | 'live_room';

export interface INotification {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  senderId: Types.ObjectId | null;
  type: NotificationType;
  referenceId: Types.ObjectId;
  referenceType: NotificationReferenceType;
  title: string;
  body: string;
  isRead: boolean;
  isPushSent: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type INotificationDocument = Document<
  Types.ObjectId,
  object,
  INotification
> &
  INotification;

export type INotificationModel = Model<INotification>;

const NINETY_DAYS_SEC = 90 * 24 * 60 * 60;

const notificationSchema = new Schema<INotification, INotificationModel>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'like',
        'comment',
        'collab_request',
        'collab_accepted',
        'new_idea_from_followed',
        'idea_trending',
        'mention',
        'idea_updated',
        'idea_version_updated',
        'system_message',
        'admin_action',
        'marketplace_bid',
        'marketplace_interest',
        'marketplace_bid_accepted',
        'marketplace_bid_rejected',
        'live_room_started',
        'live_room_reminder',
        'ai_coach_daily_brief',
      ],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    referenceType: {
      type: String,
      enum: [
        'idea',
        'comment',
        'user',
        'collab_request',
        'marketplace_listing',
        'live_room',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Body cannot exceed 500 characters'],
    },
    isRead: { type: Boolean, default: false, index: true },
    isPushSent: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NINETY_DAYS_SEC }
);

export const Notification =
  (mongoose.models.Notification as INotificationModel | undefined) ??
  mongoose.model<INotification>('Notification', notificationSchema);
