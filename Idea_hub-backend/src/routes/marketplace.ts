import { Router, type NextFunction, type Request, type Response } from 'express';
import mongoose from 'mongoose';

import {
  netToSellerUsd,
  platformFeeFromSaleUsd,
  SUBSCRIPTION_PRICES_USD,
} from '../config/monetization.config.js';
import { getEffectivePlan } from '../lib/subscription.js';
import {
  ideaPreviewForListing,
  listingToApi,
} from '../lib/serialize-marketplace.js';
import { userToApiPublic } from '../lib/serialize-user.js';
import { optionalAuth } from '../middleware/optional-auth.js';
import { requireAuth } from '../middleware/require-auth.js';
import {
  Idea,
  MarketplaceInterest,
  MarketplaceListing,
  User,
} from '../models/index.js';
import type {
  IMarketplaceBid,
  IMarketplaceListingDocument,
  MarketplaceListingStatus,
} from '../models/MarketplaceListing.model.js';
import {
  assertNoConflictingActiveListing,
  defaultListingExpiresAt,
  loadListingForSeller,
  notifyBidderOutcome,
  notifyMarketplaceBid,
  notifyMarketplaceInterest,
  validStatusTransition,
} from '../services/marketplace.service.js';

export const marketplaceRouter = Router();
const listingsRouter = Router();

const CATEGORIES = new Set([
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
]);

const LIST_PAGE = 20;

function requireDb(_req: Request, res: Response, next: NextFunction): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      data: null,
    });
    return;
  }
  next();
}

async function ideaIdsForBrowseFilters(params: {
  category?: string;
  validationMin?: number;
}): Promise<mongoose.Types.ObjectId[] | null> {
  if (!params.category && params.validationMin == null) return null;
  const q: Record<string, unknown> = {
    status: 'published',
    visibility: 'public',
  };
  if (params.category) q.category = params.category;
  if (params.validationMin != null) {
    q['validationScore.total'] = { $gte: params.validationMin };
  }
  return Idea.find(q).distinct('_id').exec();
}

async function attachListingPayload(
  doc: IMarketplaceListingDocument,
  viewerUserId: string | null
): Promise<Record<string, unknown>> {
  const idea = await Idea.findById(doc.ideaId);
  const seller = await User.findById(doc.sellerId);
  const ideaPayload = idea ? ideaPreviewForListing(idea) : null;
  const sellerPayload = seller ? userToApiPublic(seller) : null;
  const isSeller = Boolean(viewerUserId && String(doc.sellerId) === viewerUserId);

  const bidderSummaries = new Map<string, Record<string, unknown>>();
  if (isSeller && doc.bids?.length) {
    const ids = [
      ...new Set(doc.bids.map((b) => String(b.bidderId))),
    ].filter((id) => mongoose.Types.ObjectId.isValid(id));
    const users = await User.find({ _id: { $in: ids } });
    for (const u of users) {
      bidderSummaries.set(String(u._id), userToApiPublic(u));
    }
  }

  return listingToApi(doc, {
    idea: ideaPayload,
    seller: sellerPayload,
    isSeller,
    viewerUserId,
    bidderSummaries,
  });
}

listingsRouter.get('/featured', requireDb, async (_req, res) => {
  const now = new Date();
  const docs = await MarketplaceListing.find({
    status: 'active',
    expiresAt: { $gt: now },
    featuredUntil: { $gt: now },
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .exec();

  const out = await Promise.all(
    docs.map((d) => attachListingPayload(d, null))
  );
  res.json({ success: true, message: 'OK', data: out });
});

listingsRouter.get('/my', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }
  const docs = await MarketplaceListing.find({
    sellerId: new mongoose.Types.ObjectId(userId),
  })
    .sort({ updatedAt: -1 })
    .limit(100)
    .exec();
  const out = await Promise.all(
    docs.map((d) => attachListingPayload(d, userId))
  );
  res.json({ success: true, message: 'OK', data: out });
});

listingsRouter.post('/', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const ideaIdRaw = typeof body.ideaId === 'string' ? body.ideaId.trim() : '';
  const listingType = body.listingType as string | undefined;
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  const targetBuyer =
    typeof body.targetBuyer === 'string' ? body.targetBuyer.trim() : '';
  const proofPoints = Array.isArray(body.proofPoints)
    ? body.proofPoints.map((x) => String(x).trim()).filter(Boolean).slice(0, 40)
    : [];
  const askingPrice =
    typeof body.askingPrice === 'number' && body.askingPrice >= 0
      ? body.askingPrice
      : 0;
  const equity =
    typeof body.equity === 'number' && body.equity >= 0 && body.equity <= 100
      ? body.equity
      : 0;
  const statusRaw = body.status as string | undefined;
  const status: MarketplaceListingStatus =
    statusRaw === 'active' ? 'active' : 'draft';

  if (!ideaIdRaw || !mongoose.Types.ObjectId.isValid(ideaIdRaw)) {
    res.status(400).json({
      success: false,
      message: 'Valid ideaId is required',
      data: null,
    });
    return;
  }

  const allowedTypes = [
    'full_rights',
    'license',
    'co_founder',
    'investor_pitch',
  ] as const;
  if (!listingType || !allowedTypes.includes(listingType as (typeof allowedTypes)[number])) {
    res.status(400).json({
      success: false,
      message: 'Invalid listingType',
      data: null,
    });
    return;
  }

  if (!description || description.length < 20) {
    res.status(400).json({
      success: false,
      message: 'description must be at least 20 characters',
      data: null,
    });
    return;
  }

  if (listingType === 'co_founder' && equity <= 0) {
    res.status(400).json({
      success: false,
      message: 'co_founder listings require equity greater than 0',
      data: null,
    });
    return;
  }

  if (
    (listingType === 'full_rights' || listingType === 'license') &&
    askingPrice <= 0
  ) {
    res.status(400).json({
      success: false,
      message: 'askingPrice must be greater than 0 for this listing type',
      data: null,
    });
    return;
  }

  if (listingType === 'investor_pitch' && askingPrice < 0) {
    res.status(400).json({
      success: false,
      message: 'Invalid askingPrice',
      data: null,
    });
    return;
  }

  const ideaOid = new mongoose.Types.ObjectId(ideaIdRaw);
  const idea = await Idea.findById(ideaOid);
  if (!idea || idea.status !== 'published' || idea.visibility !== 'public') {
    res.status(400).json({
      success: false,
      message: 'Idea must be published and public',
      data: null,
    });
    return;
  }
  if (String(idea.authorId) !== userId) {
    res.status(403).json({
      success: false,
      message: 'Only the idea author can create a listing',
      data: null,
    });
    return;
  }

  const sellerDoc = await User.findById(userId)
    .select('subscription role')
    .lean();
  if (!sellerDoc) {
    res.status(401).json({
      success: false,
      message: 'User not found',
      data: null,
    });
    return;
  }
  const effPlan = getEffectivePlan(sellerDoc);
  if (effPlan === 'free') {
    res.status(403).json({
      success: false,
      message:
        'Marketplace listings require a Pro or Investor subscription. See Pricing to upgrade.',
      data: null,
    });
    return;
  }
  if (effPlan === 'pro') {
    const sellerOid = new mongoose.Types.ObjectId(userId);
    const listingCount = await MarketplaceListing.countDocuments({
      sellerId: sellerOid,
    });
    if (listingCount >= 1) {
      res.status(403).json({
        success: false,
        message:
          'Pro includes 1 marketplace listing. Upgrade to Investor for unlimited listings.',
        data: null,
      });
      return;
    }
  }

  if (status === 'active') {
    const ok = await assertNoConflictingActiveListing(ideaOid);
    if (!ok) {
      res.status(409).json({
        success: false,
        message: 'This idea already has an active marketplace listing',
        data: null,
      });
      return;
    }
  }

  try {
    const doc = await MarketplaceListing.create({
      ideaId: ideaOid,
      sellerId: new mongoose.Types.ObjectId(userId),
      listingType: listingType as (typeof allowedTypes)[number],
      askingPrice,
      equity: listingType === 'co_founder' ? equity : 0,
      status,
      description,
      proofPoints,
      targetBuyer,
      expiresAt: defaultListingExpiresAt(),
    });

    const payload = await attachListingPayload(doc, userId);
    res.status(201).json({
      success: true,
      message: 'Created',
      data: payload,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Create failed',
      data: null,
    });
  }
});

listingsRouter.get('/', requireDb, optionalAuth, async (req, res) => {
  const viewerId = (res.locals.authUserId as string | undefined) ?? null;
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const listingType =
    typeof req.query.listingType === 'string'
      ? req.query.listingType.trim()
      : '';
  const category =
    typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const minPrice = parseFloat(String(req.query.minPrice ?? ''));
  const maxPrice = parseFloat(String(req.query.maxPrice ?? ''));
  const validationMin = parseFloat(String(req.query.validationMin ?? ''));

  const filter: Record<string, unknown> = {
    status: 'active',
    expiresAt: { $gt: new Date() },
  };

  const types = [
    'full_rights',
    'license',
    'co_founder',
    'investor_pitch',
  ] as const;
  if (listingType && types.includes(listingType as (typeof types)[number])) {
    filter.listingType = listingType;
  }

  const priceRange: Record<string, number> = {};
  if (!Number.isNaN(minPrice)) priceRange.$gte = minPrice;
  if (!Number.isNaN(maxPrice)) priceRange.$lte = maxPrice;
  if (Object.keys(priceRange).length > 0) {
    filter.askingPrice = priceRange;
  }

  if (category && !CATEGORIES.has(category)) {
    res.status(400).json({
      success: false,
      message: 'Invalid category',
      data: null,
    });
    return;
  }

  const ideaFilter = await ideaIdsForBrowseFilters({
    category: category || undefined,
    validationMin: Number.isNaN(validationMin) ? undefined : validationMin,
  });
  if (ideaFilter && ideaFilter.length === 0) {
    res.json({
      success: true,
      message: 'OK',
      data: [],
      meta: { nextCursor: undefined, hasMore: false },
    });
    return;
  }
  if (ideaFilter && ideaFilter.length > 0) {
    filter.ideaId = { $in: ideaFilter };
  }

  const q = MarketplaceListing.find(filter).sort({ createdAt: -1 });
  if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
    q.where({ _id: { $lt: new mongoose.Types.ObjectId(cursor) } });
  }
  const docs = await q.limit(LIST_PAGE + 1).exec();
  const hasMore = docs.length > LIST_PAGE;
  const page = hasMore ? docs.slice(0, LIST_PAGE) : docs;
  const nextCursor =
    hasMore && page.length > 0 ? String(page[page.length - 1]!._id) : undefined;

  const out = await Promise.all(
    page.map((d) => attachListingPayload(d, viewerId))
  );

  res.json({
    success: true,
    message: 'OK',
    data: out,
    meta: { nextCursor, hasMore: Boolean(nextCursor) },
  });
});

listingsRouter.patch('/:id', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const nextStatus = body.status as MarketplaceListingStatus | undefined;

  if (!nextStatus || !['active', 'withdrawn', 'draft'].includes(nextStatus)) {
    res.status(400).json({
      success: false,
      message: 'status must be active, withdrawn, or draft',
      data: null,
    });
    return;
  }

  const doc = await loadListingForSeller(id, userId);
  if (!doc) {
    res.status(404).json({
      success: false,
      message: 'Listing not found',
      data: null,
    });
    return;
  }

  if (!validStatusTransition(doc.status, nextStatus)) {
    res.status(400).json({
      success: false,
      message: 'Invalid status transition',
      data: null,
    });
    return;
  }

  if (nextStatus === 'active') {
    const ok = await assertNoConflictingActiveListing(
      doc.ideaId as mongoose.Types.ObjectId,
      doc._id as mongoose.Types.ObjectId
    );
    if (!ok) {
      res.status(409).json({
        success: false,
        message: 'Another active listing exists for this idea',
        data: null,
      });
      return;
    }
    if (new Date(doc.expiresAt).getTime() <= Date.now()) {
      doc.expiresAt = defaultListingExpiresAt();
    }
  }

  doc.status = nextStatus;
  await doc.save();
  res.json({
    success: true,
    message: 'OK',
    data: await attachListingPayload(doc, userId),
  });
});

listingsRouter.get('/:id', requireDb, optionalAuth, async (req, res) => {
  const { id } = req.params;
  const viewerId = (res.locals.authUserId as string | undefined) ?? null;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({
      success: false,
      message: 'Invalid listing id',
      data: null,
    });
    return;
  }

  const doc = await MarketplaceListing.findById(id);
  if (!doc) {
    res.status(404).json({
      success: false,
      message: 'Listing not found',
      data: null,
    });
    return;
  }

  const isSeller = viewerId && String(doc.sellerId) === viewerId;
  const isPublic =
    doc.status === 'active' &&
    new Date(doc.expiresAt).getTime() > Date.now();
  if (!isPublic && !isSeller) {
    res.status(404).json({
      success: false,
      message: 'Listing not found',
      data: null,
    });
    return;
  }

  if (isPublic) {
    doc.views = (doc.views ?? 0) + 1;
    await doc.save();
  }

  res.json({
    success: true,
    message: 'OK',
    data: await attachListingPayload(doc, viewerId),
  });
});

listingsRouter.post('/:id/bid', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;
  const amount =
    typeof body.amount === 'number' && body.amount > 0 ? body.amount : 0;
  const message =
    typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';

  if (!amount) {
    res.status(400).json({
      success: false,
      message: 'amount must be a positive number',
      data: null,
    });
    return;
  }

  const doc = await MarketplaceListing.findById(id);
  if (!doc || !['active', 'under_negotiation'].includes(doc.status)) {
    res.status(404).json({
      success: false,
      message: 'Listing not available for bids',
      data: null,
    });
    return;
  }
  if (new Date(doc.expiresAt).getTime() <= Date.now()) {
    res.status(400).json({
      success: false,
      message: 'Listing has expired',
      data: null,
    });
    return;
  }
  if (String(doc.sellerId) === userId) {
    res.status(400).json({
      success: false,
      message: 'You cannot bid on your own listing',
      data: null,
    });
    return;
  }

  doc.bids.push(
    {
      bidderId: new mongoose.Types.ObjectId(userId),
      amount,
      message,
      status: 'pending',
      createdAt: new Date(),
    } as never
  );
  if (doc.status === 'active') {
    doc.status = 'under_negotiation';
  }
  await doc.save();

  const idea = await Idea.findById(doc.ideaId).select('title').lean();
  const bidder = await User.findById(userId).select('fullName username').lean();
  const bidderName =
    bidder?.fullName || bidder?.username || 'A buyer';

  await notifyMarketplaceBid({
    sellerId: doc.sellerId as mongoose.Types.ObjectId,
    bidderName,
    listingId: doc._id as mongoose.Types.ObjectId,
    amount,
    ideaTitle: idea?.title ?? 'your idea',
  });

  res.status(201).json({
    success: true,
    message: 'Bid submitted',
    data: await attachListingPayload(doc, userId),
  });
});

listingsRouter.patch(
  '/:id/bids/:bidId',
  requireDb,
  requireAuth,
  async (req, res) => {
    const userId = res.locals.authUserId as string;
    const { id, bidId } = req.params;
    const action =
      typeof req.body?.action === 'string' ? req.body.action.trim() : '';

    if (!['accept', 'reject'].includes(action)) {
      res.status(400).json({
        success: false,
        message: 'action must be accept or reject',
        data: null,
      });
      return;
    }

    const doc = await loadListingForSeller(id, userId);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: 'Listing not found',
        data: null,
      });
      return;
    }

    const bid = doc.bids.find(
      (b: IMarketplaceBid) => String(b._id) === bidId
    );
    if (!bid || bid.status !== 'pending') {
      res.status(404).json({
        success: false,
        message: 'Bid not found',
        data: null,
      });
      return;
    }

    const idea = await Idea.findById(doc.ideaId).select('title').lean();
    const ideaTitle = idea?.title ?? 'listing';

    if (action === 'reject') {
      bid.status = 'rejected';
      await doc.save();
      await notifyBidderOutcome({
        bidderId: bid.bidderId as mongoose.Types.ObjectId,
        accepted: false,
        listingId: doc._id as mongoose.Types.ObjectId,
        ideaTitle,
      });
      res.json({
        success: true,
        message: 'OK',
        data: await attachListingPayload(doc, userId),
      });
      return;
    }

    const salePrice = bid.amount;
    doc.soldTo = bid.bidderId as mongoose.Types.ObjectId;
    doc.soldPrice = salePrice;
    doc.soldAt = new Date();
    doc.platformFeeUsd = platformFeeFromSaleUsd(salePrice);
    doc.netToSellerUsd = netToSellerUsd(salePrice);
    doc.status = 'sold';
    bid.status = 'accepted';

    for (const b of doc.bids) {
      if (String(b._id) !== bidId && b.status === 'pending') {
        b.status = 'rejected';
        await notifyBidderOutcome({
          bidderId: b.bidderId as mongoose.Types.ObjectId,
          accepted: false,
          listingId: doc._id as mongoose.Types.ObjectId,
          ideaTitle,
        });
      }
    }

    await doc.save();

    await notifyBidderOutcome({
      bidderId: bid.bidderId as mongoose.Types.ObjectId,
      accepted: true,
      listingId: doc._id as mongoose.Types.ObjectId,
      ideaTitle,
    });

    res.json({
      success: true,
      message: 'Sale recorded (15% platform fee applied to seller payout)',
      data: await attachListingPayload(doc, userId),
    });
  }
);

listingsRouter.post('/:id/interest', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  const { id } = req.params;

  const doc = await MarketplaceListing.findById(id);
  if (
    !doc ||
    doc.status !== 'active' ||
    new Date(doc.expiresAt).getTime() <= Date.now()
  ) {
    res.status(404).json({
      success: false,
      message: 'Listing not found',
      data: null,
    });
    return;
  }
  if (String(doc.sellerId) === userId) {
    res.status(400).json({
      success: false,
      message: 'Cannot mark interest on your own listing',
      data: null,
    });
    return;
  }

  try {
    await MarketplaceInterest.create({
      listingId: doc._id,
      userId: new mongoose.Types.ObjectId(userId),
    });
    doc.interestedCount = (doc.interestedCount ?? 0) + 1;
    await doc.save();

    const idea = await Idea.findById(doc.ideaId).select('title').lean();
    const u = await User.findById(userId).select('fullName username').lean();
    const userName = u?.fullName || u?.username || 'Someone';

    await notifyMarketplaceInterest({
      sellerId: doc.sellerId as mongoose.Types.ObjectId,
      userName,
      listingId: doc._id as mongoose.Types.ObjectId,
      ideaTitle: idea?.title ?? 'your listing',
    });
  } catch (err) {
    const dup =
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000;
    if (!dup) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Failed',
        data: null,
      });
      return;
    }
  }

  res.status(201).json({
    success: true,
    message: 'OK',
    data: await attachListingPayload(
      (await MarketplaceListing.findById(id))!,
      userId
    ),
  });
});

marketplaceRouter.get('/seller/earnings', requireDb, requireAuth, async (req, res) => {
  const userId = res.locals.authUserId as string;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    res.status(401).json({
      success: false,
      message: 'Invalid session',
      data: null,
    });
    return;
  }

  const sales = await MarketplaceListing.find({
    sellerId: userId,
    status: 'sold',
  })
    .sort({ soldAt: -1 })
    .limit(200)
    .select('soldPrice platformFeeUsd netToSellerUsd soldAt ideaId soldTo')
    .lean();

  let gross = 0;
  let fees = 0;
  let net = 0;
  for (const s of sales) {
    gross += s.soldPrice ?? 0;
    fees += s.platformFeeUsd ?? 0;
    net += s.netToSellerUsd ?? 0;
  }

  res.json({
    success: true,
    message: 'OK',
    data: {
      sales: sales.map((s) => ({
        listingId: String(s._id),
        ideaId: String(s.ideaId),
        soldTo: s.soldTo ? String(s.soldTo) : null,
        soldPrice: s.soldPrice,
        platformFeeUsd: s.platformFeeUsd,
        netToSellerUsd: s.netToSellerUsd,
        soldAt:
          s.soldAt instanceof Date ? s.soldAt.toISOString() : s.soldAt ?? null,
      })),
      totals: {
        grossUsd: Math.round(gross * 100) / 100,
        platformFeesUsd: Math.round(fees * 100) / 100,
        netToSellerUsd: Math.round(net * 100) / 100,
      },
      subscriptionPricesUsd: SUBSCRIPTION_PRICES_USD,
    },
  });
});

marketplaceRouter.post(
  '/seller/payout/connect',
  requireDb,
  requireAuth,
  async (_req, res) => {
    res.json({
      success: true,
      message: 'Stripe Connect onboarding is not configured yet',
      data: {
        onboardingUrl: null,
        dashboardUrl: null,
      },
    });
  }
);

marketplaceRouter.use('/listings', listingsRouter);
