import type mongoose from 'mongoose';

export type LeanComment = {
  _id: mongoose.Types.ObjectId;
  ideaId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  parentCommentId: mongoose.Types.ObjectId | null;
  content: string;
  likeCount: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};
