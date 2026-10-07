'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { marketplaceApi } from '@/lib/api/marketplace.api';
import { usersApi } from '@/lib/api/users.api';
import { canCreateMarketplaceListing } from '@/lib/subscription';
import { useAuthStore } from '@/store/authStore';

const TYPES = [
  { value: 'full_rights', label: 'Full rights — transfer ownership' },
  { value: 'license', label: 'License — buyer builds, you keep IP' },
  { value: 'co_founder', label: 'Co-founder — equity partnership' },
  { value: 'investor_pitch', label: 'Investor pitch — seeking funding' },
] as const;

export default function NewMarketplaceListingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [ideaId, setIdeaId] = useState('');
  const [listingType, setListingType] = useState<string>('full_rights');
  const [description, setDescription] = useState('');
  const [targetBuyer, setTargetBuyer] = useState('');
  const [proofPoints, setProofPoints] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [equity, setEquity] = useState('');
  const [publishNow, setPublishNow] = useState(true);

  const ideasQ = useInfiniteQuery({
    queryKey: ['user-ideas', 'marketplace-new', user?._id],
    queryFn: ({ pageParam }) =>
      usersApi.getUserIdeas(user!._id, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
    enabled: Boolean(user?._id),
  });

  /** API requires published + public ideas only */
  const ideas = useMemo(
    () =>
      (ideasQ.data?.pages ?? []).flatMap((p) =>
        p.ideas.filter(
          (i) => i.status === 'published' && i.visibility === 'public'
        )
      ),
    [ideasQ.data?.pages]
  );

  useEffect(() => {
    if (ideas.length === 0) return;
    if (!ideaId || !ideas.some((i) => i._id === ideaId)) {
      setIdeaId(ideas[0]!._id);
    }
  }, [ideas, ideaId]);

  const createMut = useMutation({
    mutationFn: () => {
      const price = parseFloat(askingPrice);
      const eq = parseFloat(equity);
      const proofs = proofPoints
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return marketplaceApi.createListing({
        ideaId,
        listingType,
        description: description.trim(),
        targetBuyer: targetBuyer.trim(),
        proofPoints: proofs,
        askingPrice: Number.isFinite(price) ? price : 0,
        equity: Number.isFinite(eq) ? eq : 0,
        status: publishNow ? 'active' : 'draft',
      });
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      toast.success('Listing created');
      router.push(`/marketplace/${data._id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canUseMarketplace = canCreateMarketplaceListing(user);

  const pitchLen = description.trim().length;
  const priceNum = parseFloat(askingPrice);
  const equityNum = parseFloat(equity);

  const typeValid = useMemo(() => {
    if (listingType === 'full_rights' || listingType === 'license') {
      return Number.isFinite(priceNum) && priceNum > 0;
    }
    if (listingType === 'co_founder') {
      return (
        Number.isFinite(equityNum) && equityNum > 0 && equityNum <= 100
      );
    }
    if (listingType === 'investor_pitch') {
      return Number.isFinite(priceNum) && priceNum >= 0;
    }
    return false;
  }, [listingType, priceNum, equityNum]);

  const canSubmit =
    Boolean(ideaId) &&
    pitchLen >= 20 &&
    typeValid &&
    canUseMarketplace &&
    !createMut.isPending;

  const blockReason = (() => {
    if (!canUseMarketplace) {
      return 'Marketplace listings need a Pro or Investor plan.';
    }
    if (ideas.length === 0 && !ideasQ.isLoading) {
      return 'You need at least one published, public idea. Make an idea public in My ideas, then return here.';
    }
    if (!ideaId) return 'Select an idea.';
    if (pitchLen < 20) {
      return `Pitch must be at least 20 characters (${pitchLen}/20).`;
    }
    if (listingType === 'full_rights' || listingType === 'license') {
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        return 'Set an asking price greater than $0.';
      }
    }
    if (listingType === 'co_founder') {
      if (!Number.isFinite(equityNum) || equityNum <= 0 || equityNum > 100) {
        return 'Set equity between 1 and 100%.';
      }
    }
    if (listingType === 'investor_pitch') {
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return 'Enter funding sought (0 or more).';
      }
    }
    return null;
  })();

  const sentinelRef = useInfiniteScroll(
    () => {
      if (ideasQ.hasNextPage && !ideasQ.isFetchingNextPage) {
        void ideasQ.fetchNextPage();
      }
    },
    { enabled: Boolean(ideasQ.hasNextPage) }
  );

  if (!user) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        <Link href="/login" className="font-semibold text-brand">
          Log in
        </Link>{' '}
        to list an idea.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          New marketplace listing
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Choose a published idea and describe why it&apos;s valuable to buyers
          or investors.
        </p>
      </div>

      {!canUseMarketplace ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/55 bg-amber-50 px-4 py-4 text-sm shadow-sm dark:border-amber-400/50 dark:bg-[#3a2807] dark:shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
        >
          <p className="text-base font-semibold tracking-tight text-amber-950 dark:text-amber-50">
            Subscription required
          </p>
          <p className="mt-2 leading-relaxed text-amber-950/95 dark:text-amber-100">
            Marketplace listings need a Pro or Investor plan. Upgrade to
            continue.
          </p>
          <Link
            href="/pricing"
            className="mt-3 inline-flex font-semibold text-indigo-700 underline decoration-indigo-600/50 underline-offset-2 transition hover:text-indigo-900 dark:text-sky-200 dark:decoration-sky-300/60 dark:hover:text-sky-50"
          >
            View pricing
          </Link>
        </div>
      ) : null}

      <label className="block text-sm">
        <span className="font-medium text-[var(--color-text-primary)]">
          Idea
        </span>
        {ideasQ.isLoading ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Loading your ideas…
          </p>
        ) : ideasQ.isError ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            Could not load ideas. Refresh the page.
          </p>
        ) : ideas.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            No eligible ideas. An idea must be{' '}
            <strong className="text-[var(--color-text-primary)]">published</strong>{' '}
            and{' '}
            <strong className="text-[var(--color-text-primary)]">
              visibility: public
            </strong>
            .{' '}
            <Link href="/my-ideas" className="font-semibold text-brand hover:underline">
              My ideas
            </Link>{' '}
            ·{' '}
            <Link href="/ideas/new" className="font-semibold text-brand hover:underline">
              New idea
            </Link>
          </p>
        ) : (
          <select
            value={ideaId}
            onChange={(e) => setIdeaId(e.target.value)}
            className="input mt-1 w-full"
            required
          >
            {ideas.map((i) => (
              <option key={i._id} value={i._id}>
                {i.title}
              </option>
            ))}
          </select>
        )}
        <div ref={sentinelRef} className="h-1" />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-[var(--color-text-primary)]">
          Listing type
        </span>
        <select
          value={listingType}
          onChange={(e) => setListingType(e.target.value)}
          className="input mt-1 w-full"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {listingType === 'full_rights' || listingType === 'license' ? (
        <label className="block text-sm">
          <span className="font-medium text-[var(--color-text-primary)]">
            Asking price (USD)
          </span>
          <input
            type="number"
            min={1}
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            className="input mt-1 w-full"
            placeholder="5000"
          />
        </label>
      ) : null}

      {listingType === 'co_founder' ? (
        <>
          <label className="block text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">
              Equity offered (%)
            </span>
            <input
              type="number"
              min={1}
              max={100}
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
              className="input mt-1 w-full"
              placeholder="20"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[var(--color-text-primary)]">
              Valuation ask (USD, optional)
            </span>
            <input
              type="number"
              min={0}
              value={askingPrice}
              onChange={(e) => setAskingPrice(e.target.value)}
              className="input mt-1 w-full"
              placeholder="0"
            />
          </label>
        </>
      ) : null}

      {listingType === 'investor_pitch' ? (
        <label className="block text-sm">
          <span className="font-medium text-[var(--color-text-primary)]">
            Funding sought (USD, 0 if open)
          </span>
          <input
            type="number"
            min={0}
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            className="input mt-1 w-full"
            placeholder="50000"
          />
        </label>
      ) : null}

      <label className="block text-sm">
        <span className="flex flex-wrap items-baseline justify-between gap-2 font-medium text-[var(--color-text-primary)]">
          Pitch to buyers
          <span
            className={
              pitchLen >= 20
                ? 'text-xs font-normal text-emerald-600 dark:text-emerald-400'
                : 'text-xs font-normal text-amber-800 dark:text-amber-200/90'
            }
          >
            {pitchLen}/20+ characters
          </span>
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input mt-1 min-h-[140px] w-full"
          placeholder="Why should someone pay for this? Traction, research, defensibility…"
          minLength={20}
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-[var(--color-text-primary)]">
          Ideal buyer (optional)
        </span>
        <input
          value={targetBuyer}
          onChange={(e) => setTargetBuyer(e.target.value)}
          className="input mt-1 w-full"
          placeholder="e.g. Series A SaaS startups, enterprise IT…"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-[var(--color-text-primary)]">
          Proof points (one per line)
        </span>
        <textarea
          value={proofPoints}
          onChange={(e) => setProofPoints(e.target.value)}
          className="input mt-1 min-h-[80px] w-full"
          placeholder="https://…&#10;Survey results…"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          checked={publishNow}
          onChange={(e) => setPublishNow(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]"
        />
        Publish immediately (otherwise save as draft)
      </label>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          loading={createMut.isPending}
          onClick={() => void createMut.mutateAsync()}
          disabled={!canSubmit}
        >
          {publishNow ? 'Publish listing' : 'Save draft'}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/marketplace">Cancel</Link>
        </Button>
      </div>
      {!canSubmit && blockReason ? (
        <p
          role="status"
          className="text-sm font-medium text-amber-900 dark:text-amber-100"
        >
          {blockReason}
        </p>
      ) : null}
    </div>
  );
}
