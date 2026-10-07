'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { TESTIMONIAL_AVATARS } from '@/data/landing-media';

import { LandingAvatar } from './LandingAvatar';
import { LandingSection } from './LandingSection';

const items = [
  {
    quote:
      'We replaced three tools with Idea Hub for our pre-MVP narrative. The validation layer alone saved us a month of investor back-and-forth.',
    name: 'Marcus Chen',
    title: 'VP Product',
    org: 'Northline Systems',
    avatar: TESTIMONIAL_AVATARS.marcus,
  },
  {
    quote:
      'As an operator, I care about how founders think before I see a deck. Idea Hub is the first feed where signal beats performative hustle.',
    name: 'Dr. Amara Okonkwo',
    title: 'Partner',
    org: 'Helix Ventures',
    avatar: TESTIMONIAL_AVATARS.amara,
  },
  {
    quote:
      'Our lab posts hypotheses weekly. The collaboration requests turned into two funded joint projects, without cold email.',
    name: 'James Whitfield',
    title: 'Research Director',
    org: 'Institute for Applied Cognition',
    avatar: TESTIMONIAL_AVATARS.james,
  },
  {
    quote:
      'I run a 40-person collective. Revenue splits and public idea threads finally live in one audited workspace.',
    name: 'Riley Park',
    title: 'Co-founder',
    org: 'Podium Creators Guild',
    avatar: TESTIMONIAL_AVATARS.riley,
  },
] as const;

export function TestimonialsPro() {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const n = items.length;
  const next = useCallback(() => setI((x) => (x + 1) % n), [n]);
  const prev = useCallback(() => setI((x) => (x - 1 + n) % n), [n]);

  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(next, 8000);
    return () => window.clearInterval(t);
  }, [next, reduce]);

  const cur = items[i]!;

  return (
    <LandingSection
      id="community"
      tone="muted"
      shell="none"
      ariaLabelledBy="testimonials-heading"
      className="scroll-mt-24 border-y border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20"
    >
      <h2
        id="testimonials-heading"
        className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl"
      >
        Trusted by operators who ship
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-700 dark:text-slate-300">
        Product, research, and investment leaders use Idea Hub to compress the distance between rough
        concept and accountable execution.
      </p>

      <div className="relative isolate mt-14">
        <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700/50 dark:bg-slate-950 md:p-10">
          <div className="flex flex-col gap-8 md:flex-row md:gap-10">
            <LandingAvatar
              initials={cur.avatar.initials}
              from={cur.avatar.from}
              to={cur.avatar.to}
              className="mx-auto md:mx-0"
            />

            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={i}
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <blockquote className="text-lg font-semibold leading-relaxed text-slate-900 dark:text-slate-50 md:text-xl">
                    “{cur.quote}”
                  </blockquote>
                  <footer className="mt-8 border-t border-slate-200 pt-6 dark:border-white/10">
                    <cite className="not-italic text-lg font-bold text-slate-900 dark:text-white">
                      {cur.name}
                    </cite>
                    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {cur.title} · {cur.org}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['SOC2-aligned', 'EU hosting option', 'Export-ready'].map((badge) => (
                        <span
                          key={badge}
                          className="rounded-md border border-slate-300/90 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:border-white/15 dark:bg-slate-900/80 dark:text-slate-200"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </footer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2">
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === i ? 'w-9 bg-brand-600 dark:bg-indigo-400' : 'w-2 bg-slate-300 dark:bg-slate-600'
                }`}
                aria-label={`Slide ${idx + 1}`}
                aria-current={idx === i}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={prev}
          className="absolute left-0 top-1/2 z-10 hidden -translate-x-2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2.5 text-slate-800 transition hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 md:flex"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          className="absolute right-0 top-1/2 z-10 hidden translate-x-2 -translate-y-1/2 rounded-full border border-slate-200 bg-white p-2.5 text-slate-800 transition hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 md:flex"
          aria-label="Next testimonial"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </LandingSection>
  );
}
