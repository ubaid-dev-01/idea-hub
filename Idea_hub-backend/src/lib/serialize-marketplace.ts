import type { IIdeaDocument } from '../models/Idea.model.js';
import type { IMarketplaceListingDocument } from '../models/MarketplaceListing.model.js';

import { ideaToApi } from './serialize-idea.js';

export function ideaPreviewForListing(
  idea: IIdeaDocument | Record<string, unknown>
): Record<string, unknown> {
  const j = ideaToApi(idea as IIdeaDocument);
  const media = (j.media as Array<Record<string, unknown>>) ?? [];
  const first = media.find(
    (m) => m.mediaType === 'image' || m.mediaType === 'video'
  );
  const thumb = first
    ? String(
        first.thumbnailUrl || first.cdnUrl || first.firebaseUrl || ''
      ).trim()
    : '';
  return {
    _id: j._id,
    title: j.title,
    category: j.category,
    thumbnailUrl: thumb,
    validationScore: j.validationScore,
  };
}

function iso(d: unknown): string | null {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return null;
}

export function listingToApi(
  doc: IMarketplaceListingDocument,
  opts: {
    idea?: Record<string, unknown> | null;
    seller?: Record<string, unknown> | null;
    isSeller?: boolean;
    viewerUserId?: string | null;
    bidderSummaries?: Map<string, Record<string, unknown>>;
  } = {}
): Record<string, unknown> {
  const j = doc.toObject({ virtuals: true });
  const bids = Array.isArray(j.bids) ? j.bids : [];
  const viewer = opts.viewerUserId ?? null;
  const isSeller = Boolean(opts.isSeller);

  function mapBid(b: Record<string, unknown>) {
    const bidderId = String(b.bidderId);
    const base = {
      _id: String(b._id),
      bidderId,
      amount: b.amount,
      message: b.message ?? '',
      status: b.status,
      createdAt: iso(b.createdAt),
    };
    if (isSeller && opts.bidderSummaries?.has(bidderId)) {
      return { ...base, bidder: opts.bidderSummaries.get(bidderId) };
    }
    return base;
  }

  let bidsOut: unknown[] = [];
  if (isSeller) {
    bidsOut = bids.map((b) => mapBid(b as Record<string, unknown>));
  } else if (viewer) {
    bidsOut = bids
      .filter((b) => String((b as Record<string, unknown>).bidderId) === viewer)
      .map((b) => mapBid(b as Record<string, unknown>));
  }

  return {
    _id: String(j._id),
    ideaId: String(j.ideaId),
    sellerId: String(j.sellerId),
    listingType: j.listingType,
    askingPrice: j.askingPrice ?? 0,
    equity: j.equity ?? 0,
    status: j.status,
    description: j.description ?? '',
    proofPoints: j.proofPoints ?? [],
    targetBuyer: j.targetBuyer ?? '',
    views: j.views ?? 0,
    interestedCount: j.interestedCount ?? 0,
    bidCount: bids.length,
    bids: bidsOut,
    soldTo: j.soldTo ? String(j.soldTo) : null,
    soldPrice: j.soldPrice ?? null,
    soldAt: iso(j.soldAt),
    platformFeeUsd: j.platformFeeUsd ?? null,
    netToSellerUsd: j.netToSellerUsd ?? null,
    expiresAt: iso(j.expiresAt),
    featuredUntil: iso(j.featuredUntil ?? null),
    isFeatured: Boolean(
      j.featuredUntil &&
        new Date(j.featuredUntil as Date).getTime() > Date.now()
    ),
    createdAt: iso(j.createdAt),
    updatedAt: iso(j.updatedAt),
    idea: opts.idea ?? null,
    seller: opts.seller ?? null,
  };
}
