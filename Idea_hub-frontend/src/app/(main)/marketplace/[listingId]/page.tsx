'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { BidModal } from '@/components/marketplace/BidModal';
import { ValidationScoreCard } from '@/components/idea/ValidationScoreCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ideasApi } from '@/lib/api/ideas.api';
import { marketplaceApi } from '@/lib/api/marketplace.api';
import { useAuthStore } from '@/store/authStore';

const TYPE_LABEL: Record<string, string> = {
  full_rights: 'Full rights',
  license: 'License',
  co_founder: 'Co-founder',
  investor_pitch: 'Investor pitch',
};

export default function MarketplaceListingDetailPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [bidOpen, setBidOpen] = useState(false);

  const listingQ = useQuery({
    queryKey: ['marketplace', 'listing', listingId],
    queryFn: () => marketplaceApi.getById(listingId),
    enabled: Boolean(listingId),
  });

  const listing = listingQ.data;
  const ideaId = listing?.ideaId;

  const ideaQ = useQuery({
    queryKey: ['idea', ideaId],
    queryFn: () => ideasApi.getById(ideaId!),
    enabled: Boolean(ideaId),
  });

  const ideaForScore = ideaQ.data;

  const similarQ = useQuery({
    queryKey: [
      'marketplace',
      'similar',
      listing?.listingType,
      listing?.idea?.category,
    ],
    queryFn: async () => {
      const res = await marketplaceApi.browse({
        listingType: listing!.listingType,
        category: listing!.idea?.category,
      });
      return res.listings.filter((l) => l._id !== listing!._id).slice(0, 6);
    },
    enabled: Boolean(listing?.listingType && listing?.idea?.category),
    staleTime: 60_000,
  });

  const interestMut = useMutation({
    mutationFn: () => marketplaceApi.expressInterest(listingId),
    onSuccess: () => {
      toast.success('Interest sent — the seller was notified');
      void queryClient.invalidateQueries({
        queryKey: ['marketplace', 'listing', listingId],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const isSeller =
    user && listing && user._id === listing.sellerId;
  const canTransact =
    listing &&
    ['active', 'under_negotiation'].includes(listing.status) &&
    user &&
    !isSeller;

  if (listingQ.isLoading) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">Loading listing…</p>
    );
  }

  if (listingQ.isError || !listing) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {listingQ.error instanceof Error
          ? listingQ.error.message
          : 'Listing not found'}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[var(--color-border-light)] dark:bg-gray-800">
            {listing.idea?.thumbnailUrl ? (
              <Image
                src={listing.idea.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
                <Lightbulb className="h-14 w-14" aria-hidden />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-bold text-brand dark:text-indigo-300">
              {TYPE_LABEL[listing.listingType] ?? listing.listingType}
            </span>
            {listing.idea?.category ? (
              <span className="rounded-full bg-surface2 px-3 py-1 text-xs capitalize dark:bg-gray-800">
                {listing.idea.category}
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
            {listing.idea?.title ?? 'Idea listing'}
          </h1>
          {ideaForScore ? (
            <ValidationScoreCard idea={ideaForScore} />
          ) : ideaQ.isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Loading viability score…
            </p>
          ) : null}

          <section>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
              Pitch
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
              {listing.description}
            </p>
          </section>

          {listing.proofPoints?.length ? (
            <section>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                Proof points
              </h2>
              <ul className="mt-2 list-inside list-disc text-sm text-[var(--color-text-secondary)]">
                {listing.proofPoints.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {listing.targetBuyer ? (
            <section>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                Ideal buyer
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {listing.targetBuyer}
              </p>
            </section>
          ) : null}

          {ideaForScore?.description ? (
            <section>
              <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
                Idea description
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
                {ideaForScore.description}
              </p>
              <Link
                href={`/ideas/${ideaForScore._id}`}
                className="mt-2 inline-block text-sm font-semibold text-brand dark:text-indigo-400"
              >
                Open full idea →
              </Link>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-gray-700">
            <p className="text-xs text-[var(--color-text-muted)]">Asking</p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
              {listing.listingType === 'co_founder'
                ? `${listing.equity}% equity`
                : listing.listingType === 'investor_pitch'
                  ? listing.askingPrice > 0
                    ? `Seeking $${listing.askingPrice.toLocaleString()}`
                    : 'Seeking investment'
                  : `$${listing.askingPrice.toLocaleString()}`}
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              {listing.views} views · {listing.interestedCount} interested ·{' '}
              {listing.bidCount} offers
            </p>
            {canTransact ? (
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setBidOpen(true)}
                >
                  Make an offer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  loading={interestMut.isPending}
                  onClick={() => void interestMut.mutateAsync()}
                >
                  Express interest
                </Button>
              </div>
            ) : null}
            {isSeller ? (
              <Button asChild variant="secondary" className="mt-4 w-full">
                <Link href="/marketplace/my">Manage in dashboard</Link>
              </Button>
            ) : null}
          </div>

          {listing.seller ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-gray-700">
              <h3 className="text-xs font-bold uppercase text-[var(--color-text-muted)]">
                Seller
              </h3>
              <Link
                href={`/profile/${listing.seller.username}`}
                className="mt-3 flex items-center gap-3"
              >
                <Avatar
                  src={listing.seller.avatarUrl}
                  fallback={listing.seller.fullName}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">
                    {listing.seller.fullName}
                  </p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    @{listing.seller.username} ·{' '}
                    {listing.seller.totalIdeasPosted} ideas
                  </p>
                </div>
              </Link>
            </div>
          ) : null}

          {similarQ.data && similarQ.data.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">
                Similar listings
              </h3>
              <ul className="space-y-2 text-sm">
                {similarQ.data.map((l) => (
                  <li key={l._id}>
                    <Link
                      href={`/marketplace/${l._id}`}
                      className="text-[var(--color-text-secondary)] hover:text-brand dark:hover:text-indigo-400"
                    >
                      {l.idea?.title ?? 'Listing'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      <BidModal
        open={bidOpen}
        onClose={() => setBidOpen(false)}
        listingId={listing._id}
        suggestedMin={
          listing.askingPrice > 0 ? listing.askingPrice : undefined
        }
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: ['marketplace', 'listing', listingId],
          });
        }}
      />
    </div>
  );
}
