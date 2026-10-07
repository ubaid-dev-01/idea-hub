'use client';

import Link from 'next/link';

import { Reveal } from '../motion/Reveal';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Public ideas, core feedback, and community discovery.',
    features: ['Unlimited public posts', 'Structured comments', 'Basic matching'],
    cta: 'Start free',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$24',
    period: '/ month',
    description: 'Private workspaces and AI validation for serious builders.',
    features: [
      'Private workspaces',
      'AI clarity & risk scoring',
      'Priority matching',
      'Export narratives',
    ],
    cta: 'Start Pro trial',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Governance, SSO, and investor digests for teams that ship at scale.',
    features: ['SSO & roles', 'API access', 'Investor digests', 'Dedicated support'],
    cta: 'Talk to us',
    href: '/contact',
    highlight: false,
  },
];

export function LandingPricing() {
  return (
    <section
      id="pricing"
      className="landing-section bg-[var(--lh-surface)]"
      aria-labelledby="pricing-heading"
    >
      <div className="landing-container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="landing-eyebrow">Pricing</p>
          <h2
            id="pricing-heading"
            className="landing-display mt-5 text-[clamp(2rem,4.5vw,3.5rem)] font-semibold"
          >
            Simple, confident pricing.
          </h2>
          <p className="landing-lede mx-auto mt-6">
            Start free. Upgrade when privacy, validation, and scale matter.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div
                className={`flex h-full flex-col rounded-3xl p-8 md:p-10 ${
                  plan.highlight
                    ? 'bg-[var(--lh-ink)] text-[var(--lh-bg)]'
                    : 'bg-[var(--lh-bg)]'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    plan.highlight ? 'text-white/60' : 'text-[var(--lh-muted)]'
                  }`}
                >
                  {plan.name}
                </p>
                <p className="landing-display mt-4 flex items-baseline gap-1 text-4xl font-bold tracking-tight">
                  {plan.price}
                  {plan.period ? (
                    <span
                      className={`text-base font-medium ${
                        plan.highlight ? 'text-white/50' : 'text-[var(--lh-muted)]'
                      }`}
                    >
                      {plan.period}
                    </span>
                  ) : null}
                </p>
                <p
                  className={`mt-4 text-sm leading-relaxed ${
                    plan.highlight ? 'text-white/70' : 'text-[var(--lh-muted)]'
                  }`}
                >
                  {plan.description}
                </p>
                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex gap-2 text-sm ${
                        plan.highlight ? 'text-white/85' : 'text-[var(--lh-ink)]'
                      }`}
                    >
                      <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-10 inline-flex h-12 items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-90 ${
                    plan.highlight
                      ? 'bg-white text-[var(--lh-ink)]'
                      : 'bg-[var(--lh-ink)] text-white'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--lh-muted)]">
          Need a custom plan?{' '}
          <Link
            href="/contact"
            className="font-medium text-[var(--lh-ink)] underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Contact sales
          </Link>
        </p>
      </div>
    </section>
  );
}
