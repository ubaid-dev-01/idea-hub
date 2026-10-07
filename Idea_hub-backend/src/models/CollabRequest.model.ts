import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

import {
  modelEvents,
  type CollabAcceptedPayload,
  type CollabRequestCreatedPayload,
} from './modelEvents.js';

export type CollabRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface ICollabRequest {
  _id: Types.ObjectId;
  ideaId: Types.ObjectId;
  requesterId: Types.ObjectId;
  message: string;
  skillsOffered: string[];
  status: CollabRequestStatus;
  responseMessage: string;
  respondedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ICollabRequestDocument = Document<
  Types.ObjectId,
  object,
  ICollabRequest
> &
  ICollabRequest;

export type ICollabRequestModel = Model<ICollabRequest>;

const collabRequestSchema = new Schema<ICollabRequest, ICollabRequestModel>(
  {
    ideaId: {
      type: Schema.Types.ObjectId,
      ref: 'Idea',
      required: true,
      index: true,
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: [true, 'Collaboration message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    skillsOffered: {
      type: [String],
      default: [],
      validate: {
        validator: (v: string[]) => v.length <= 30,
        message: 'Too many skills offered',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
      default: 'pending',
    },
    responseMessage: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Response message is too long'],
    },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

collabRequestSchema.index({ ideaId: 1, status: 1 });
collabRequestSchema.index({ requesterId: 1, status: 1 });
collabRequestSchema.index({ ideaId: 1, requesterId: 1 }, { unique: true });

collabRequestSchema.pre('save', function collabPreSave(next) {
  const d = this as ICollabRequestDocument;
  d.$locals.justInsertedCollab = this.isNew;
  d.$locals.collabJustAccepted = false;
  if (!d.isNew && d.isModified('status') && d.status === 'accepted') {
    type WithPrevious = { previous?: (path: string) => unknown };
    const prev = (d as unknown as WithPrevious).previous?.('status') as
      | CollabRequestStatus
      | undefined;
    if (prev !== 'accepted') {
      d.$locals.collabJustAccepted = true;
    }
  }
  next();
});

collabRequestSchema.post(
  'save',
  function collabPostSave(doc: ICollabRequestDocument) {
    if (doc.$locals.justInsertedCollab) {
      const payload: CollabRequestCreatedPayload = {
        ideaId: doc.ideaId.toString(),
        requestId: doc._id.toString(),
        requesterId: doc.requesterId.toString(),
      };
      setImmediate(() => {
        modelEvents.emit('collab:request-created', payload);
      });
    }
    if (doc.$locals.collabJustAccepted) {
      const payload: CollabAcceptedPayload = {
        ideaId: doc.ideaId.toString(),
        requesterId: doc.requesterId.toString(),
      };
      setImmediate(() => {
        modelEvents.emit('collab:accepted', payload);
      });
    }
  }
);

export const CollabRequest =
  (mongoose.models.CollabRequest as ICollabRequestModel | undefined) ??
  mongoose.model<ICollabRequest>('CollabRequest', collabRequestSchema);
