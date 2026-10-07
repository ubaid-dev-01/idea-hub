import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export type AdminAuditTargetType =
  | 'user'
  | 'idea'
  | 'comment'
  | 'collab_request';

export interface IAdminAuditLog {
  _id: Types.ObjectId;
  adminId: Types.ObjectId;
  action: string;
  targetType: AdminAuditTargetType;
  targetId: Types.ObjectId;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  reason: string;
  ipAddress: string;
  createdAt: Date;
}

export type IAdminAuditLogDocument = Document<
  Types.ObjectId,
  object,
  IAdminAuditLog
> &
  IAdminAuditLog;

export type IAdminAuditLogModel = Model<IAdminAuditLog>;

const adminAuditLogSchema = new Schema<IAdminAuditLog, IAdminAuditLogModel>(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [200, 'Action key is too long'],
    },
    targetType: {
      type: String,
      enum: ['user', 'idea', 'comment', 'collab_request'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    beforeState: { type: Schema.Types.Mixed, default: {} },
    afterState: { type: Schema.Types.Mixed, default: {} },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Reason is too long'],
    },
    ipAddress: {
      type: String,
      required: true,
      trim: true,
      maxlength: [45, 'IP address is too long'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

adminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

export const AdminAuditLog =
  (mongoose.models.AdminAuditLog as IAdminAuditLogModel | undefined) ??
  mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema);
