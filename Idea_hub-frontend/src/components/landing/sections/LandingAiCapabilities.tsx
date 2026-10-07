'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { LANDING_LOTTIE } from '@/data/landing-lottie';

import { LottiePlayer } from '../LottiePlayer';
import { Reveal } from '../motion/Reveal';

const CAPABILITIES = [
  {
    label: 'Clarity score',
    detail:
      'Detects vague claims, missing constraints, and weak problem framing before peer review.',
  },
  {
    label: 'Risk & policy flags',
    detail:
      'Surfaces IP, compliance, and go-to-market risks early — while iteration is still cheap.',
  },
  {
    label: 'Narrative coach',
    detail:
      'Turns scattered threads into a launch-ready story investors and partners can follow.',
  },
  {
    label: 'Intent matching',
    detail:
      'Pairs ideas with collaborators based on skills, stage, and commitment — not follower counts.',
  },
];

export function LandingAiCapabilities() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  return (
    <section
      id="ai"
      className="landing-section bg-[var(--lh-surface)]"
      aria-labelledby="ai-heading"
    >
      <div className="landing-container">
        <Reveal>
          <p className="landing-eyebrow">AI capabilities</p>
          <h2
            id="ai-heading"
            className="landing-display mt-5 max-w-[16ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold"
          >
            Intelligence that respects the craft.
          </h2>
          <p className="landing-lede mt-6">
            Not another chatbot bolted onto a feed. Assistive scoring and coaching
            that sits inside your workflow.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal className="flex items-center justify-center">
            <LottiePlayer
              src={LANDING_LOTTIE.ai}
              className="aspect-square w-full max-w-sm"
              aria-label="AI automation animation"
            />
          </Reveal>

          <ol className="relative border-l border-[var(--lh-line)] pl-8">
            {CAPABILITIES.map((cap, i) => {
              const isActive = active === i;
              return (
                <li key={cap.label} className="relative pb-10 last:pb-0">
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    className="group w-full text-left"
                    aria-expanded={isActive}
                  >
                    <span
                      className={`absolute -left-[2.15rem] top-1.5 h-3 w-3 rounded-full border-2 transition-colors ${
                        isActive
                          ? 'border-[var(--lh-accent)] bg-[var(--lh-accent)]'
                          : 'border-[var(--lh-line)] bg-[var(--lh-bg)] group-hover:border-[var(--lh-muted)]'
                      }`}
                      aria-hidden
                    />
                    <h3
                      className={`landing-display text-xl font-semibold transition-colors md:text-2xl ${
                        isActive ? 'text-[var(--lh-ink)]' : 'text-[var(--lh-muted)]'
                      }`}
                    >
                      {cap.label}
                    </h3>
                    <AnimatePresence initial={false}>
                      {isActive ? (
                        <motion.p
                          key="detail"
                          initial={reduce ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-3 overflow-hidden text-[15px] leading-relaxed text-[var(--lh-muted)]"
                        >
                          {cap.detail}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
