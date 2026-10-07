'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ListingCard } from '@/components/marketplace/ListingCard';
import { Button } from '@/components/ui/Button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { marketplaceApi } from '@/lib/api/marketplace.api';
import { useAuthStore } from '@/store/authStore';

const CATEGORIES = [
  '',
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
] as const;

const TYPES = [
  '',
  'full_rights',
  'license',
  'co_founder',
  'investor_pitch',
] as const;

const TYPE_LABEL: Record<string, string> = {
  '': 'All types',
  full_rights: 'Full rights',
  license: 'License',
  co_founder: 'Co-founder',
  investor_pitch: 'Investor pitch',
};

export default function MarketplaceBrowsePage() {
  const user = useAuthStore((s) => s.user);
  const [listingType, setListingType] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [validationMin, setValidationMin] = useState<string>('');

  const filterParams = useMemo(() => {
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    const vmin = parseFloat(validationMin);
    return {
      listingType: listingType || undefined,
      category: category || undefined,
      minPrice: Number.isFinite(min) ? min : undefined,
      maxPrice: Number.isFinite(max) ? max : undefined,
      validationMin: Number.isFinite(vmin) ? vmin : undefined,
    };
  }, [listingType, category, minPrice, maxPrice, validationMin]);

  const featuredQ = useQuery({
    queryKey: ['marketplace', 'featured'],
    queryFn: () => marketplaceApi.featured(),
    staleTime: 60_000,
  });

  const listQ = useInfiniteQuery({
    queryKey: ['marketplace', 'browse', filterParams],
    queryFn: ({ pageParam }) =>
      marketplaceApi.browse({ ...filterParams, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  const pages = listQ.data?.pages ?? [];
  const listings = pages.flatMap((p) => p.listings);
  const sentinelRef = useInfiniteScroll(
    () => {
      if (listQ.hasNextPage && !listQ.isFetchingNextPage) {
        void listQ.fetchNextPage();
      }
    },
    { enabled: Boolean(listQ.hasNextPage) }
  );

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-brand/10 via-[var(--color-surface)] to-indigo-500/10 px-6 py-10 text-center dark:border-gray-700 md:px-12">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)] md:text-4xl">
          Turn your ideas into income
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-text-muted)] md:text-base">
          List ideas for sale, license, or co-founder opportunities. Buyers and
          investors discover vetted concepts — you keep control until a deal
          closes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {user ? (
            <>
              <Button asChild>
                <Link href="/marketplace/new">List an idea</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/marketplace/my">Seller dashboard</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href="/login">Log in to sell</Link>
            </Button>
          )}
        </div>
      </section>

      {featuredQ.data && featuredQ.data.length > 0 ? (
        <section>
          <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
            Featured listings
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredQ.data.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-bold text-[var(--color-text-primary)]">
          Browse
        </h2>
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-gray-700 md:flex-row md:flex-wrap md:items-end">
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-[var(--color-text-muted)]">
            Type
            <select
              value={listingType}
              onChange={(e) => setListingType(e.target.value)}
              className="input mt-1 h-10 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t || 'all'} value={t}>
                  {TYPE_LABEL[t] ?? t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[140px] flex-1 flex-col text-xs font-medium text-[var(--color-text-muted)]">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input mt-1 h-10 text-sm capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c || 'all'} value={c}>
                  {c || 'All categories'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[100px] flex-1 flex-col text-xs font-medium text-[var(--color-text-muted)]">
            Min $
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="input mt-1 h-10 text-sm"
              inputMode="decimal"
              placeholder="0"
            />
          </label>
          <label className="flex min-w-[100px] flex-1 flex-col text-xs font-medium text-[var(--color-text-muted)]">
            Max $
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="input mt-1 h-10 text-sm"
              inputMode="decimal"
              placeholder="Any"
            />
          </label>
          <label className="flex min-w-[120px] flex-1 flex-col text-xs font-medium text-[var(--color-text-muted)]">
            Min score
            <input
              value={validationMin}
              onChange={(e) => setValidationMin(e.target.value)}
              className="input mt-1 h-10 text-sm"
              inputMode="numeric"
              placeholder="0–100"
            />
          </label>
        </div>

        {listQ.isLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : listQ.isError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {listQ.error instanceof Error
              ? listQ.error.message
              : 'Failed to load'}
          </p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No listings match your filters.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l._id} listing={l} />
              ))}
            </div>
            <div ref={sentinelRef} className="h-8" />
            {listQ.isFetchingNextPage ? (
              <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
                Loading more…
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
