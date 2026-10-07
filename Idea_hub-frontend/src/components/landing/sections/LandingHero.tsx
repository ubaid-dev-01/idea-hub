import { LANDING_LOTTIE } from '@/data/landing-lottie';

import { LandingButton } from '../LandingButton';
import { HeroVisual } from './HeroVisual';

export function LandingHero() {
  return (
    <section
      className="relative min-h-[100svh] overflow-hidden pt-24 md:pt-28"
      aria-labelledby="landing-hero-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 70% 20%, var(--lh-accent-soft), transparent 60%), radial-gradient(ellipse 60% 40% at 10% 80%, rgba(10,10,10,0.03), transparent 55%)',
        }}
      />

      <div className="landing-container relative grid min-h-[calc(100svh-6rem)] items-center gap-10 pb-16 lg:grid-cols-[0.95fr_1.15fr] lg:gap-6 lg:pb-24">
        <div className="max-w-2xl">
          <p className="landing-display text-[clamp(2.75rem,8vw,5.5rem)] font-bold text-[var(--lh-ink)]">
            Idea Hub
          </p>

          <h1
            id="landing-hero-heading"
            className="landing-display mt-6 max-w-[14ch] text-[clamp(1.75rem,4.2vw,3rem)] font-semibold text-[var(--lh-ink)]"
          >
            Where serious ideas become accountable products.
          </h1>

          <p className="landing-lede mt-6">
            Share privately or publicly. Collect structured feedback. Match with
            collaborators. Launch with a narrative investors trust.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <LandingButton href="/register">Start free</LandingButton>
            <LandingButton href="/feed" variant="secondary">
              Explore the feed
            </LandingButton>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--lh-muted)]">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--lh-accent)]"
                aria-hidden
              />
              Trusted by 12,000+ builders
            </span>
            <span>Free to start · No credit card</span>
          </div>
        </div>

        <div className="relative mx-auto flex w-full items-center justify-center lg:origin-center lg:scale-110 lg:justify-end">
          <HeroVisual src={LANDING_LOTTIE.hero} />
        </div>
      </div>

      <div
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        aria-hidden
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--lh-muted)]">
          Scroll
        </span>
        <span className="landing-scroll-line h-8 w-px bg-[var(--lh-line)]" />
      </div>
    </section>
  );
}
