'use client';

import { LANDING_LOTTIE } from '@/data/landing-lottie';

import { LottiePlayer } from '../LottiePlayer';
import { Reveal } from '../motion/Reveal';

const FEATURES = [
  {
    id: 'feedback',
    eyebrow: 'Collaborative feedback',
    title: 'Critique that stays actionable.',
    body: 'Mentions, visibility controls, and threaded review — so every comment advances the idea instead of performing for an audience.',
    lottie: LANDING_LOTTIE.feedback,
    reverse: false,
  },
  {
    id: 'validation',
    eyebrow: 'AI validation',
    title: 'Signal before you ship the narrative.',
    body: 'Multi-modal scanning surfaces clarity gaps, risk flags, and policy friction while the idea is still cheap to change.',
    lottie: LANDING_LOTTIE.validation,
    reverse: true,
  },
  {
    id: 'matching',
    eyebrow: 'Founder matching',
    title: 'Collaborators by intent, not vanity.',
    body: 'Discovery tuned for builders who want to commit — not scroll. Requests land with context, not cold DMs.',
    lottie: LANDING_LOTTIE.matching,
    reverse: false,
  },
  {
    id: 'workspaces',
    eyebrow: 'Public & private',
    title: 'Draft in private. Publish with control.',
    body: 'Private workspaces for co-founders. Selective shares for advisors. Open feed when the story is ready.',
    lottie: LANDING_LOTTIE.workspace,
    reverse: true,
  },
];

export function LandingFeatures() {
  return (
    <div id="features">
      {FEATURES.map((feature) => (
        <section
          key={feature.id}
          id={feature.id}
          className="landing-section border-t border-[var(--lh-line)]"
          aria-labelledby={`${feature.id}-heading`}
        >
          <div
            className={`landing-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${
              feature.reverse ? 'lg:[&>*:first-child]:order-2' : ''
            }`}
          >
            <Reveal>
              <p className="landing-eyebrow">{feature.eyebrow}</p>
              <h2
                id={`${feature.id}-heading`}
                className="landing-display mt-5 max-w-[14ch] text-[clamp(2rem,4vw,3.25rem)] font-semibold"
              >
                {feature.title}
              </h2>
              <p className="landing-lede mt-6">{feature.body}</p>
            </Reveal>
            <Reveal delay={0.08} className="flex justify-center">
              <LottiePlayer
                src={feature.lottie}
                className="aspect-square w-full max-w-sm"
                aria-label={feature.eyebrow}
              />
            </Reveal>
          </div>
        </section>
      ))}
    </div>
  );
}
