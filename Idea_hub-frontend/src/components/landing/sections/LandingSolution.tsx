'use client';

import { useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from 'framer-motion';

import { LANDING_LOTTIE } from '@/data/landing-lottie';

import { LottiePlayer } from '../LottiePlayer';
import { Reveal } from '../motion/Reveal';

const BEATS = [
  {
    title: 'Capture with intent',
    body: 'Problem, hypothesis, constraints — one durable record instead of a disappearing chat.',
    lottie: LANDING_LOTTIE.solution,
  },
  {
    title: 'Invite the right critique',
    body: 'Structured threads and visibility controls keep feedback actionable, not performative.',
    lottie: LANDING_LOTTIE.feedback,
  },
  {
    title: 'Validate before you go wide',
    body: 'AI scoring surfaces clarity, risk, and policy flags before your idea leaves the draft.',
    lottie: LANDING_LOTTIE.validation,
  },
  {
    title: 'Match and move',
    body: 'Collaboration requests and discovery tuned for intent — not vanity metrics.',
    lottie: LANDING_LOTTIE.matching,
  },
];

export function LandingSolution() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const next = Math.min(BEATS.length - 1, Math.floor(v * BEATS.length));
    setActive(next);
  });

  return (
    <section
      id="solution"
      className="bg-[var(--lh-surface)]"
      aria-labelledby="solution-heading"
    >
      <div className="landing-container landing-section pb-8">
        <Reveal>
          <p className="landing-eyebrow">The solution</p>
          <h2
            id="solution-heading"
            className="landing-display mt-5 max-w-[18ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold"
          >
            One operating system for ideation.
          </h2>
          <p className="landing-lede mt-6">
            Scroll through the journey. Motion and narrative stay in sync —
            the way your ideas should.
          </p>
        </Reveal>
      </div>

      <div ref={ref} className="relative mx-auto max-w-6xl px-4 md:px-6">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:h-[70vh] lg:self-start">
            <div className="flex h-full items-center justify-center py-8">
              <LottiePlayer
                key={BEATS[active].lottie}
                src={BEATS[active].lottie}
                className="aspect-square w-full max-w-md"
                aria-label={BEATS[active].title}
              />
            </div>
          </div>

          <div className="pb-24 pt-4 lg:pb-40">
            {BEATS.map((beat, i) => (
              <div
                key={beat.title}
                className="flex min-h-[50vh] flex-col justify-center border-t border-[var(--lh-line)] py-16 first:border-t-0 lg:min-h-[60vh]"
              >
                <motion.div
                  animate={
                    reduce
                      ? undefined
                      : {
                          x: active === i ? 0 : 8,
                        }
                  }
                  transition={{ duration: 0.35 }}
                >
                  <p
                    className={`text-xs font-medium tracking-[0.16em] ${
                      active === i
                        ? 'text-[var(--lh-accent)]'
                        : 'text-[var(--lh-muted)]'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3
                    className={`landing-display mt-4 text-3xl font-semibold md:text-4xl ${
                      active === i
                        ? 'text-[var(--lh-ink)]'
                        : 'text-[var(--lh-ink-soft)]'
                    }`}
                  >
                    {beat.title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--lh-muted)] md:text-lg">
                    {beat.body}
                  </p>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
