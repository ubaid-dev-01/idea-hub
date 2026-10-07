'use client';

import { LANDING_LOTTIE } from '@/data/landing-lottie';

import { LottiePlayer } from '../LottiePlayer';
import { Reveal } from '../motion/Reveal';

export function LandingProblem() {
  return (
    <section id="problem" className="landing-section" aria-labelledby="problem-heading">
      <div className="landing-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="landing-eyebrow">The problem</p>
          <h2
            id="problem-heading"
            className="landing-display mt-5 max-w-[16ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold text-[var(--lh-ink)]"
          >
            Great ideas die in Slack threads and scattered docs.
          </h2>
          <p className="landing-lede mt-6">
            Feedback is noisy. Ownership is unclear. Validation is anecdotal.
            By the time you need a coherent narrative, the signal is already gone.
          </p>
          <ul className="mt-10 space-y-4 text-[15px] leading-relaxed text-[var(--lh-muted)]">
            {[
              'Critique without structure becomes performance.',
              'Private drafts and public posts live in different worlds.',
              'Collaboration requests get lost between DMs and decks.',
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--lh-accent)]"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="flex justify-center lg:justify-end">
          <LottiePlayer
            src={LANDING_LOTTIE.problem}
            className="aspect-square w-full max-w-md"
            aria-label="Animation illustrating complex idea processing"
          />
        </Reveal>
      </div>
    </section>
  );
}
