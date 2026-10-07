import mongoose, {
  type Document,
  type Model,
  Schema,
  type Types,
} from 'mongoose';

export interface IMarketplaceInterest {
  _id: Types.ObjectId;
  listingId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

export type IMarketplaceInterestDocument = Document<
  Types.ObjectId,
  object,
  IMarketplaceInterest
> &
  IMarketplaceInterest;

export type IMarketplaceInterestModel = Model<IMarketplaceInterest>;

const marketplaceInterestSchema = new Schema<
  IMarketplaceInterest,
  IMarketplaceInterestModel
>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'MarketplaceListing',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

marketplaceInterestSchema.index({ listingId: 1, userId: 1 }, { unique: true });

export const MarketplaceInterest =
  (mongoose.models.MarketplaceInterest as IMarketplaceInterestModel | undefined) ??
  mongoose.model<IMarketplaceInterest>(
    'MarketplaceInterest',
    marketplaceInterestSchema
  );
