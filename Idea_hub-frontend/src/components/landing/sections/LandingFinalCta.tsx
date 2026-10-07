'use client';

import { Reveal } from '../motion/Reveal';
import { LandingButton } from '../LandingButton';

export function LandingFinalCta() {
  return (
    <section className="landing-section" aria-labelledby="final-cta-heading">
      <div className="landing-container">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2
            id="final-cta-heading"
            className="landing-display text-[clamp(2.5rem,7vw,5rem)] font-bold text-[var(--lh-ink)]"
          >
            Ship the idea.
            <br />
            Own the narrative.
          </h2>
          <p className="landing-lede mx-auto mt-8">
            Join thousands of founders and operators building in public — and in private —
            on Idea Hub.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <LandingButton href="/register">Create your account</LandingButton>
            <LandingButton href="/feed" variant="secondary">
              Browse ideas
            </LandingButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
