'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { Reveal } from '../motion/Reveal';

const PREVIEWS = [
  {
    title: 'Public feed',
    caption: 'Ideas with signal — upvotes, structured replies, clear ownership.',
    tone: 'from-[#1a1a1a] to-[#2a2a2a]',
  },
  {
    title: 'Private workspace',
    caption: 'Co-founder drafts with controlled visibility and revision history.',
    tone: 'from-[#0f766e] to-[#134e4a]',
  },
  {
    title: 'Validation panel',
    caption: 'Clarity, risk, and narrative scores beside the living document.',
    tone: 'from-[#171717] to-[#404040]',
  },
];

export function LandingProductPreview() {
  const reduce = useReducedMotion();

  return (
    <section
      id="product"
      className="landing-section"
      aria-labelledby="product-heading"
    >
      <div className="landing-container">
        <Reveal>
          <p className="landing-eyebrow">Product</p>
          <h2
            id="product-heading"
            className="landing-display mt-5 max-w-[16ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold"
          >
            Built for focus, not noise.
          </h2>
          <p className="landing-lede mt-6">
            A calm interface for high-stakes ideation — every surface earns its place.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {PREVIEWS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <motion.figure
                className="group"
                whileHover={reduce ? undefined : { y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              >
                <div
                  className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${p.tone}`}
                >
                  {/* Abstract product chrome — not a stock screenshot box */}
                  <div className="absolute inset-6 flex flex-col gap-3 opacity-90 transition-transform duration-500 group-hover:scale-[1.02]">
                    <div className="h-2 w-16 rounded-full bg-white/25" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-[85%] rounded-full bg-white/40" />
                      <div className="h-3 w-[60%] rounded-full bg-white/25" />
                      <div className="h-3 w-[70%] rounded-full bg-white/20" />
                    </div>
                    <div className="mt-auto space-y-2 pb-2">
                      <div className="h-16 rounded-xl bg-white/10" />
                      <div className="h-10 rounded-xl bg-white/8" />
                    </div>
                  </div>
                </div>
                <figcaption className="mt-5">
                  <p className="landing-display text-lg font-semibold">{p.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--lh-muted)]">
                    {p.caption}
                  </p>
                </figcaption>
              </motion.figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
