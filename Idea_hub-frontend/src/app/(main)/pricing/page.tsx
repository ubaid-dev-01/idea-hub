'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { subscriptionsApi } from '@/lib/api/subscriptions.api';
import { ICONS } from '@/lib/icons';
import { getEffectivePlan } from '@/lib/subscription';
import { usersApi } from '@/lib/api/users.api';
import { useAuthStore } from '@/store/authStore';

const FREE_FEATURES = [
  '3 new ideas per month',
  'Basic AI scan',
  '10 AI coach messages per day',
  'Standard feed & marketplace browse',
];

const PRO_FEATURES = [
  'Unlimited ideas',
  'Priority AI scan',
  'Unlimited AI coach',
  'Featured in search (coming soon)',
  '1 marketplace listing',
  'NDA on collaborations (coming soon)',
  'Analytics dashboard (coming soon)',
  'Export PDF / deck (coming soon)',
];

const INVESTOR_FEATURES = [
  'Everything in Pro',
  'Full marketplace access',
  'Filter by validation score (coming soon)',
  'Contact founders (coming soon)',
  'Idea revision history (coming soon)',
  'Weekly investment digest (coming soon)',
  'Verification badge (coming soon)',
];

function FeatureRow({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed">
      <ICONS.check
        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-emerald-600 dark:text-emerald-300"
        aria-hidden
      />
      <span className="text-slate-800 dark:text-neutral-100">{children}</span>
    </li>
  );
}

function PricingContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<'pro' | 'investor' | 'portal' | null>(
    null
  );

  const billingStatusQ = useQuery({
    queryKey: ['subscriptions', 'status'],
    queryFn: () => subscriptionsApi.getStatus(),
    staleTime: 60_000,
  });
  const stripeOk =
    billingStatusQ.isSuccess &&
    billingStatusQ.data.stripeConfigured === true;

  useEffect(() => {
    const c = searchParams.get('checkout');
    if (c === 'success') {
      toast.success('Payment received — confirming your plan…');
      const token = useAuthStore.getState().accessToken;
      if (!token) return;

      let cancelled = false;
      void (async () => {
        // Retry: Stripe can lag a few seconds after redirect
        for (let attempt = 0; attempt < 5; attempt++) {
          if (cancelled) return;
          try {
            await subscriptionsApi.sync();
          } catch {
            /* keep trying getMe */
          }
          try {
            const u = await usersApi.getMe();
            if (cancelled) return;
            updateUser(u);
            const plan = getEffectivePlan(u);
            if (plan !== 'free') {
              toast.success(`You're on ${plan}`);
              return;
            }
          } catch {
            /* ignore */
          }
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
        if (!cancelled) {
          toast.error(
            'Payment ok, but plan not updated yet. Refresh in a minute or open Pricing again.'
          );
        }
      })();

      return () => {
        cancelled = true;
      };
    }
    if (c === 'cancel') {
      toast('Checkout cancelled');
    }
  }, [searchParams, updateUser]);

  const eff = user ? getEffectivePlan(user) : 'free';

  async function checkout(plan: 'pro' | 'investor') {
    if (!user) {
      toast.error('Sign in to subscribe');
      return;
    }
    if (!stripeOk) {
      toast.error(
        'Billing is not configured on the API. Set STRIPE_SECRET_KEY and price IDs in api.ideahub.com/.env, then restart the server.'
      );
      return;
    }
    setLoading(plan);
    try {
      const url = await subscriptionsApi.createCheckout({
        plan,
        interval: plan === 'investor' ? 'month' : interval,
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(null);
    }
  }

  async function portal() {
    if (!user) {
      toast.error('Sign in first');
      return;
    }
    if (!stripeOk) {
      toast.error(
        'Billing is not configured on the API. Set STRIPE_SECRET_KEY in api.ideahub.com/.env, then restart.'
      );
      return;
    }
    setLoading('portal');
    try {
      const url = await subscriptionsApi.getBillingPortalUrl();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open portal');
    } finally {
      setLoading(null);
    }
  }

  async function refreshPlan() {
    if (!user) return;
    setLoading('portal');
    try {
      const sync = await subscriptionsApi.sync();
      const u = await usersApi.getMe();
      updateUser(u);
      const plan = getEffectivePlan(u);
      if (plan !== 'free') {
        toast.success(`Plan updated: ${plan}`);
      } else if (sync.synced) {
        toast.success('Synced — refresh if plan still looks free');
      } else {
        toast.error(sync.reason || 'No paid subscription found on Stripe yet');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not refresh plan');
    } finally {
      setLoading(null);
    }
  }

  const proPriceLabel =
    interval === 'year' ? '$79 / year' : '$9 / month';
  const proSub =
    interval === 'year'
      ? 'About $6.58/mo — save vs monthly'
      : 'Billed monthly';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {!billingStatusQ.isLoading &&
      (billingStatusQ.isError ||
        (billingStatusQ.isSuccess && !billingStatusQ.data.stripeConfigured)) ? (
        <div
          role="status"
          className="mb-8 rounded-xl border border-amber-400/55 bg-amber-50 px-4 py-4 text-left text-sm shadow-sm dark:border-amber-400/50 dark:bg-[#3a2807] dark:shadow-[0_0_0_1px_rgba(251,191,36,0.12)]"
        >
          <p className="font-semibold text-amber-950 dark:text-amber-50">
            Online payments are not available here yet
          </p>
          <p className="mt-2 leading-relaxed text-amber-950/95 dark:text-amber-100">
            {billingStatusQ.isError
              ? 'We could not confirm billing status. Make sure the IdeaHub API is running and the web app points to it.'
              : 'This usually means Stripe is not set up on the API (common on localhost). Subscriptions and checkout stay disabled until that is configured.'}
          </p>
          <details className="mt-3 rounded-lg border border-amber-300/70 bg-amber-100/70 p-3 dark:border-amber-400/35 dark:bg-black/35">
            <summary className="cursor-pointer text-sm font-medium text-amber-950 dark:text-amber-50">
              {billingStatusQ.isError
                ? 'Developer: API connection & billing'
                : 'Developer: enable Stripe on the API'}
            </summary>
            {billingStatusQ.isError ? (
              <p className="mt-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                Start the API (e.g.{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  npm run dev
                </code>{' '}
                in{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  api.ideahub.com
                </code>
                ). In the web app, set{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  NEXT_PUBLIC_API_URL
                </code>{' '}
                to that origin (e.g.{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  http://localhost:4001
                </code>
                ), restart Next.js, then reload this page.
              </p>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100">
                The API reports{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  stripeConfigured: false
                </code>
                . In{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  api.ideahub.com/.env
                </code>{' '}
                set{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  STRIPE_SECRET_KEY
                </code>{' '}
                and the{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  STRIPE_PRICE_*
                </code>{' '}
                IDs from your Stripe Dashboard, then restart the API. Copy from{' '}
                <code className="rounded border border-amber-900/10 bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-amber-950 dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-50">
                  .env.example
                </code>{' '}
                in that project.
              </p>
            )}
          </details>
        </div>
      ) : null}

      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--text)]">
          Plans for builders and investors
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-muted)]">
          Start free, upgrade when you need unlimited ideas, faster scans, and
          marketplace tools.
        </p>
        {user ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={loading === 'portal'}
              disabled={!stripeOk}
              title={
                !stripeOk
                  ? 'Stripe is not configured on the API (see banner above)'
                  : undefined
              }
              onClick={() => void portal()}
            >
              Manage billing
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!stripeOk || loading !== null}
              onClick={() => void refreshPlan()}
            >
              Refresh plan
            </Button>
            <span className="text-xs text-[var(--text-muted)]">
              Current plan:{' '}
              <span className="font-semibold capitalize text-[var(--text)]">
                {eff}
              </span>
            </span>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            <Link href="/login" className="font-medium text-brand underline">
              Sign in
            </Link>{' '}
            to subscribe or manage billing.
          </p>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <div
          className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm dark:border-slate-600/60 dark:bg-slate-900/80"
          role="group"
          aria-label="Billing interval"
        >
          <button
            type="button"
            className={cn(
              'rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              interval === 'month'
                ? 'bg-brand text-white shadow-md dark:bg-indigo-500'
                : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
            )}
            onClick={() => setInterval('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            className={cn(
              'rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
              interval === 'year'
                ? 'bg-brand text-white shadow-md dark:bg-indigo-500'
                : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
            )}
            onClick={() => setInterval('year')}
          >
            <span className="block sm:inline">Yearly</span>
            <span
              className={cn(
                'mt-0.5 block text-xs font-normal sm:ml-1 sm:inline sm:mt-0',
                interval === 'year'
                  ? 'text-white/90'
                  : 'text-slate-500 dark:text-slate-300'
              )}
            >
              (save on Pro)
            </span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3 md:items-stretch">
        <div className="flex min-h-[22rem] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 pb-6 dark:border-slate-700/50 dark:bg-[#18191a]">
          <h2 className="text-lg font-bold text-[var(--text)]">Free</h2>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">$0</p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">Forever</p>
          <ul className="mt-5 flex-1 space-y-3">
            {FREE_FEATURES.map((f) => (
              <FeatureRow key={f}>{f}</FeatureRow>
            ))}
          </ul>
          <div className="mt-6 border-t border-[var(--border)] pt-5 dark:border-slate-700/60">
            {eff === 'free' && user ? (
              <Button type="button" variant="secondary" fullWidth disabled>
                Current plan
              </Button>
            ) : (
              <Link href="/register" className="block">
                <Button type="button" variant="secondary" fullWidth>
                  Get started free
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div
          className={cn(
            'relative flex min-h-[22rem] flex-col overflow-visible rounded-2xl border-2 border-brand bg-[var(--surface)] px-6 pb-6 pt-8 shadow-lg ring-1 ring-brand/20 dark:border-indigo-500/70 dark:bg-[#18191a] dark:ring-indigo-500/20'
          )}
        >
          <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-brand px-3.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md dark:bg-indigo-500">
            Most popular
          </span>
          <h2 className="text-lg font-bold text-[var(--text)]">Pro</h2>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            {proPriceLabel}
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">{proSub}</p>
          <ul className="mt-5 flex-1 space-y-3">
            {PRO_FEATURES.map((f) => (
              <FeatureRow key={f}>{f}</FeatureRow>
            ))}
          </ul>
          <div className="mt-6 border-t border-[var(--border)] pt-5 dark:border-indigo-500/25">
            {eff === 'pro' ? (
              <Button type="button" variant="secondary" fullWidth disabled>
                Current plan
              </Button>
            ) : user ? (
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={loading === 'pro'}
                disabled={!stripeOk}
                title={
                  !stripeOk
                    ? 'Configure Stripe on the API to enable checkout'
                    : undefined
                }
                onClick={() => void checkout('pro')}
              >
                Subscribe with Stripe
              </Button>
            ) : (
              <Link href="/login" className="block">
                <Button type="button" variant="primary" fullWidth>
                  Sign in to subscribe
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="flex min-h-[22rem] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 pb-6 dark:border-slate-700/50 dark:bg-[#18191a]">
          <h2 className="text-lg font-bold text-[var(--text)]">Investor</h2>
          <p className="mt-1 text-2xl font-bold text-[var(--text)]">
            $49 / month
          </p>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Billed monthly
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-neutral-500">
            Annual billing can be enabled at checkout when available.
          </p>
          <ul className="mt-4 flex-1 space-y-3">
            {INVESTOR_FEATURES.map((f) => (
              <FeatureRow key={f}>{f}</FeatureRow>
            ))}
          </ul>
          <div className="mt-6 border-t border-[var(--border)] pt-5 dark:border-slate-700/60">
            {eff === 'investor' ? (
              <Button type="button" variant="secondary" fullWidth disabled>
                Current plan
              </Button>
            ) : user ? (
              <Button
                type="button"
                variant="primary"
                fullWidth
                loading={loading === 'investor'}
                disabled={!stripeOk}
                title={
                  !stripeOk
                    ? 'Configure Stripe on the API to enable checkout'
                    : undefined
                }
                onClick={() => void checkout('investor')}
              >
                Subscribe with Stripe
              </Button>
            ) : (
              <Link href="/login" className="block">
                <Button type="button" variant="primary" fullWidth>
                  Sign in to subscribe
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-[var(--text-muted)]">
          Loading…
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
