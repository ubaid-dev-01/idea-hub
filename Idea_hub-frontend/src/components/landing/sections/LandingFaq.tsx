'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';

import { Reveal } from '../motion/Reveal';

const FAQS = [
  {
    q: 'Is Idea Hub free to start?',
    a: 'Yes. You can post ideas, join discussions, and use core collaboration tools at no cost. Pro and Enterprise unlock private workspaces, advanced validation, and investor digests.',
  },
  {
    q: 'Who is Idea Hub for?',
    a: 'Founders, researchers, product operators, and investors who want a durable record of ideation — not another social feed optimized for engagement.',
  },
  {
    q: 'Can I keep ideas private?',
    a: 'Absolutely. Draft in private workspaces, invite specific collaborators, or publish to the public feed when you are ready. Visibility is always under your control.',
  },
  {
    q: 'How does AI validation work?',
    a: 'Our models score clarity, risk, and narrative coherence against your draft. Results are assistive guidance — they never replace peer review or your judgment.',
  },
  {
    q: 'Do you sell my ideas?',
    a: 'No. Your intellectual property remains yours. Marketplace listings are opt-in. We never train public models on private workspace content.',
  },
];

export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <section id="faq" className="landing-section" aria-labelledby="faq-heading">
      <div className="landing-container grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <Reveal>
          <p className="landing-eyebrow">FAQ</p>
          <h2
            id="faq-heading"
            className="landing-display mt-5 text-[clamp(2rem,4vw,3.25rem)] font-semibold"
          >
            Straight answers.
          </h2>
          <p className="landing-lede mt-6">
            Everything you need before you create your first idea.
          </p>
        </Reveal>

        <div className="divide-y divide-[var(--lh-line)] border-y border-[var(--lh-line)]">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={item.q} delay={i * 0.04}>
                <div>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="landing-display text-lg font-semibold tracking-tight md:text-xl">
                      {item.q}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--lh-line)]"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 pr-12 text-[15px] leading-relaxed text-[var(--lh-muted)]">
                          {item.a}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
