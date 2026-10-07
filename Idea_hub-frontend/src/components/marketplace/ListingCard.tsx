'use client';

import { Lightbulb } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import type { IMarketplaceListing } from '@/types/api';

const TYPE_LABEL: Record<string, string> = {
  full_rights: 'Full rights',
  license: 'License',
  co_founder: 'Co-founder',
  investor_pitch: 'Investor pitch',
};

function priceLabel(l: IMarketplaceListing): string {
  if (l.listingType === 'co_founder') {
    return l.equity > 0 ? `Equity: ${l.equity}%` : 'Co-founder';
  }
  if (l.listingType === 'investor_pitch') {
    return l.askingPrice > 0
      ? `Seeking: $${l.askingPrice.toLocaleString()}`
      : 'Seeking investment';
  }
  return `$${l.askingPrice.toLocaleString()}`;
}

export function ListingCard({ listing }: { listing: IMarketplaceListing }) {
  const idea = listing.idea;
  const thumb = idea?.thumbnailUrl ?? '';
  const vs = idea?.validationScore?.total;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm transition hover:shadow-md dark:border-gray-700">
      <Link
        href={`/marketplace/${listing._id}`}
        className="relative aspect-[16/10] w-full bg-[var(--color-border-light)] dark:bg-gray-800"
      >
        {thumb ? (
          <Image
            src={thumb}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            <Lightbulb className="h-10 w-10" aria-hidden />
          </div>
        )}
        {listing.isFeatured ? (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Featured
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold uppercase text-brand dark:text-indigo-300">
            {TYPE_LABEL[listing.listingType] ?? listing.listingType}
          </span>
          {idea?.category ? (
            <span className="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--color-text-muted)] dark:bg-gray-800">
              {idea.category}
            </span>
          ) : null}
        </div>
        <Link
          href={`/marketplace/${listing._id}`}
          className="line-clamp-2 text-base font-bold text-[var(--color-text-primary)] hover:text-brand dark:hover:text-indigo-400"
        >
          {idea?.title ?? 'Idea listing'}
        </Link>
        <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-muted)]">
          {listing.description}
        </p>
        <p className="mt-3 text-lg font-bold text-[var(--color-text-primary)]">
          {priceLabel(listing)}
        </p>
        {typeof vs === 'number' ? (
          <div className="mt-3">
            <div className="mb-0.5 flex justify-between text-[10px] text-[var(--color-text-muted)]">
              <span>Validation score</span>
              <span>{Math.round(vs)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border-light)] dark:bg-gray-700">
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r from-brand to-emerald-500'
                )}
                style={{ width: `${Math.min(100, vs)}%` }}
              />
            </div>
          </div>
        ) : null}
        <div className="mt-4 flex flex-1 items-end">
          <Button asChild size="sm" className="w-full">
            <Link href={`/marketplace/${listing._id}`}>View details</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
