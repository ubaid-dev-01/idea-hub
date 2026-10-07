import mongoose from 'mongoose';

import {
  BehaviorEvent,
  CoachSession,
  CollabRequest,
  CollectionFollow,
  Comment,
  Follow,
  Idea,
  IdeaCollection,
  IdeaCollectionItem,
  IdeaPollVote,
  IdeaVersion,
  Like,
  LiveRoom,
  LiveRoomMessage,
  LiveRoomQuestion,
  LiveRoomRsvp,
  MarketplaceInterest,
  MarketplaceListing,
  Notification,
  SavedIdea,
  UpdateRequest,
  User,
} from '../models/index.js';

export async function purgeIdea(ideaId: mongoose.Types.ObjectId): Promise<void> {
  await CoachSession.deleteMany({ ideaId });
  const liveRooms = await LiveRoom.find({ ideaId }).select('_id').lean();
  if (liveRooms.length > 0) {
    const lrIds = liveRooms.map((r) => r._id);
    await LiveRoomMessage.deleteMany({ roomId: { $in: lrIds } });
    await LiveRoomQuestion.deleteMany({ roomId: { $in: lrIds } });
    await LiveRoomRsvp.deleteMany({ roomId: { $in: lrIds } });
    await LiveRoom.deleteMany({ _id: { $in: lrIds } });
  }
  const listings = await MarketplaceListing.find({ ideaId }).select('_id').lean();
  if (listings.length > 0) {
    await MarketplaceInterest.deleteMany({
      listingId: { $in: listings.map((l) => l._id) },
    });
  }
  await MarketplaceListing.deleteMany({ ideaId });
  await Comment.deleteMany({ ideaId });
  await Like.deleteMany({ ideaId });
  await IdeaVersion.deleteMany({ ideaId });
  await IdeaPollVote.deleteMany({ ideaId });
  await IdeaCollectionItem.deleteMany({ ideaId });
  await SavedIdea.deleteMany({ ideaId });
  await CollabRequest.deleteMany({ ideaId });
  await UpdateRequest.deleteMany({ ideaId });
  await Idea.findByIdAndDelete(ideaId);
}

export async function purgeUser(uid: mongoose.Types.ObjectId): Promise<void> {
  const authorIdeas = await Idea.find({ authorId: uid }).select('_id').lean();
  for (const row of authorIdeas) {
    await purgeIdea(row._id);
  }

  const ownedCols = await IdeaCollection.find({ ownerId: uid }).select('_id').lean();
  for (const c of ownedCols) {
    await IdeaCollectionItem.deleteMany({ collectionId: c._id });
    await CollectionFollow.deleteMany({ collectionId: c._id });
  }
  await IdeaCollection.deleteMany({ ownerId: uid });
  await CollectionFollow.deleteMany({ followerId: uid });

  await MarketplaceInterest.deleteMany({ userId: uid });
  await MarketplaceListing.deleteMany({ sellerId: uid });
  await Comment.deleteMany({ authorId: uid });
  await Like.deleteMany({ userId: uid });
  await SavedIdea.deleteMany({ userId: uid });
  await Follow.deleteMany({
    $or: [{ followerId: uid }, { followingId: uid }],
  });
  await Notification.deleteMany({
    $or: [{ recipientId: uid }, { senderId: uid }],
  });
  await CollabRequest.deleteMany({ requesterId: uid });
  await UpdateRequest.deleteMany({ requesterId: uid });
  await BehaviorEvent.deleteMany({ userId: uid });
  await CoachSession.deleteMany({ userId: uid });

  const hostedRooms = await LiveRoom.find({ hostId: uid }).select('_id').lean();
  for (const r of hostedRooms) {
    await LiveRoomMessage.deleteMany({ roomId: r._id });
    await LiveRoomQuestion.deleteMany({ roomId: r._id });
    await LiveRoomRsvp.deleteMany({ roomId: r._id });
    await LiveRoom.deleteOne({ _id: r._id });
  }
  await LiveRoomMessage.deleteMany({ userId: uid });
  await LiveRoomQuestion.deleteMany({ userId: uid });
  await LiveRoomRsvp.deleteMany({ userId: uid });
  await LiveRoom.updateMany(
    { participants: { $elemMatch: { userId: uid } } },
    { $pull: { participants: { userId: uid } } }
  );
  await LiveRoom.updateMany(
    { 'validationVotes.userId': uid },
    { $pull: { validationVotes: { userId: uid } } }
  );
  await LiveRoom.updateMany(
    { 'recentReactions.userId': uid },
    { $pull: { recentReactions: { userId: uid } } }
  );
  await LiveRoom.updateMany(
    { 'livePoll.votes.userId': uid },
    { $pull: { 'livePoll.votes': { userId: uid } } }
  );

  await Idea.updateMany(
    { 'collaborators.userId': uid },
    { $pull: { collaborators: { userId: uid } } }
  );

  await User.findByIdAndDelete(uid);
}

export async function countSuperAdmins(): Promise<number> {
  return User.countDocuments({ role: 'super_admin' });
}
