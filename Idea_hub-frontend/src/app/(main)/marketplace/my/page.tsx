'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { marketplaceApi } from '@/lib/api/marketplace.api';
import { useAuthStore } from '@/store/authStore';
import type { IMarketplaceBidRow, IMarketplaceListing } from '@/types/api';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  under_negotiation: 'In negotiation',
  sold: 'Sold',
  withdrawn: 'Withdrawn',
};

export default function MarketplaceSellerDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const listingsQ = useQuery({
    queryKey: ['marketplace', 'my'],
    queryFn: () => marketplaceApi.myListings(),
    enabled: Boolean(user),
  });

  const earningsQ = useQuery({
    queryKey: ['marketplace', 'earnings'],
    queryFn: () => marketplaceApi.earnings(),
    enabled: Boolean(user),
  });

  const payoutMut = useMutation({
    mutationFn: () => marketplaceApi.payoutConnect(),
    onSuccess: (data) => {
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast.success(
          'Stripe Connect is not configured yet — check back soon.'
        );
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'active' | 'withdrawn' | 'draft';
    }) => marketplaceApi.updateListingStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'my'] });
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bidMut = useMutation({
    mutationFn: ({
      listingId,
      bidId,
      action,
    }: {
      listingId: string;
      bidId: string;
      action: 'accept' | 'reject';
    }) => marketplaceApi.respondToBid(listingId, bidId, action),
    onSuccess: (_, v) => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace', 'my'] });
      toast.success(v.action === 'accept' ? 'Sale recorded' : 'Offer declined');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] p-8 text-center dark:border-gray-700">
        <p className="text-sm text-[var(--color-text-muted)]">
          <Link href="/login" className="font-semibold text-brand">
            Log in
          </Link>{' '}
          to manage your listings.
        </p>
      </div>
    );
  }

  const listings = listingsQ.data ?? [];
  const earnings = earningsQ.data;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Seller dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Manage listings, review offers, and track payouts (15% platform fee
            on completed sales).
          </p>
        </div>
        <Button asChild>
          <Link href="/marketplace/new">New listing</Link>
        </Button>
      </div>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 dark:border-gray-700">
        <h2 className="text-sm font-bold text-[var(--color-text-primary)]">
          Earnings
        </h2>
        {earningsQ.isLoading ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : earnings ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Gross sales</p>
              <p className="text-xl font-bold text-[var(--color-text-primary)]">
                ${earnings.totals.grossUsd.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Platform fees (15%)
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                ${earnings.totals.platformFeesUsd.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Your net</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                ${earnings.totals.netToSellerUsd.toLocaleString()}
              </p>
            </div>
          </div>
        ) : null}
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Premium listing ${earnings?.subscriptionPricesUsd.premiumListingMonthly ?? 29}
          /mo · Pro seller ${earnings?.subscriptionPricesUsd.proSellerMonthly ?? 9}
          /mo · Investor ${earnings?.subscriptionPricesUsd.investorMonthly ?? 99}
          /mo — billing coming soon.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          loading={payoutMut.isPending}
          onClick={() => void payoutMut.mutateAsync()}
        >
          Set up payouts (Stripe)
        </Button>
        {earnings?.sales?.length ? (
          <ul className="mt-6 space-y-2 border-t border-[var(--color-border)] pt-4 dark:border-gray-700">
            {earnings.sales.slice(0, 10).map((s) => (
              <li
                key={s.listingId}
                className="flex flex-wrap justify-between gap-2 text-xs text-[var(--color-text-secondary)]"
              >
                <span>Listing {s.listingId.slice(-6)}</span>
                <span>
                  Net ${(s.netToSellerUsd ?? 0).toLocaleString()} ·{' '}
                  {s.soldAt?.slice(0, 10) ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
          My listings
        </h2>
        {listingsQ.isLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No listings yet.{' '}
            <Link href="/marketplace/new" className="font-semibold text-brand">
              Create one
            </Link>
          </p>
        ) : (
          <ul className="space-y-4">
            {listings.map((l: IMarketplaceListing) => (
              <li
                key={l._id}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/marketplace/${l._id}`}
                      className="font-semibold text-[var(--color-text-primary)] hover:text-brand"
                    >
                      {l.idea?.title ?? 'Listing'}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {STATUS_LABEL[l.status] ?? l.status} ·{' '}
                      {l.bidCount} offers · expires{' '}
                      {l.expiresAt?.slice(0, 10) ?? '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {l.status === 'draft' ? (
                      <Button
                        type="button"
                        size="sm"
                        loading={statusMut.isPending}
                        onClick={() =>
                          void statusMut.mutateAsync({
                            id: l._id,
                            status: 'active',
                          })
                        }
                      >
                        Publish
                      </Button>
                    ) : null}
                    {l.status === 'active' || l.status === 'under_negotiation' ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={statusMut.isPending}
                        onClick={() =>
                          void statusMut.mutateAsync({
                            id: l._id,
                            status: 'withdrawn',
                          })
                        }
                      >
                        Withdraw
                      </Button>
                    ) : null}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/marketplace/${l._id}`}>View</Link>
                    </Button>
                  </div>
                </div>

                {l.bids?.length ? (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-4 dark:border-gray-700">
                    <button
                      type="button"
                      className="text-xs font-bold text-brand dark:text-indigo-400"
                      onClick={() =>
                        setExpanded((x) => (x === l._id ? null : l._id))
                      }
                    >
                      {expanded === l._id ? 'Hide' : 'Show'} incoming offers (
                      {l.bids.filter((b) => b.status === 'pending').length}{' '}
                      pending)
                    </button>
                    {expanded === l._id ? (
                      <ul className="mt-3 space-y-3">
                        {l.bids.map((b: IMarketplaceBidRow) => (
                          <li
                            key={b._id}
                            className="rounded-lg bg-[var(--color-border-light)]/40 p-3 text-sm dark:bg-gray-800/80"
                          >
                            <div className="flex flex-wrap justify-between gap-2">
                              <span className="font-semibold text-[var(--color-text-primary)]">
                                ${b.amount.toLocaleString()}
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {b.status}
                              </span>
                            </div>
                            {b.bidder ? (
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                From @{b.bidder.username}
                              </p>
                            ) : null}
                            {b.message ? (
                              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                                {b.message}
                              </p>
                            ) : null}
                            {b.status === 'pending' &&
                            (l.status === 'active' ||
                              l.status === 'under_negotiation') ? (
                              <div className="mt-3 flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  loading={bidMut.isPending}
                                  onClick={() =>
                                    void bidMut.mutateAsync({
                                      listingId: l._id,
                                      bidId: b._id,
                                      action: 'accept',
                                    })
                                  }
                                >
                                  Accept
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  loading={bidMut.isPending}
                                  onClick={() =>
                                    void bidMut.mutateAsync({
                                      listingId: l._id,
                                      bidId: b._id,
                                      action: 'reject',
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
