'use client';

import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';

import { Reveal } from '../motion/Reveal';

const STEPS = [
  {
    n: '01',
    title: 'Post',
    body: 'Capture the problem, hypothesis, and constraints. Attach media. Set visibility.',
  },
  {
    n: '02',
    title: 'Refine',
    body: 'Structured comments and reactions land in one timeline. Iterate without losing context.',
  },
  {
    n: '03',
    title: 'Validate',
    body: 'AI signals and community review surface risk before you go public or raise.',
  },
  {
    n: '04',
    title: 'Match',
    body: 'Find collaborators by intent — builders, researchers, operators ready to commit.',
  },
  {
    n: '05',
    title: 'Launch',
    body: 'Promote validated concepts to your network, marketplace, or investor pipeline.',
  },
];

export function LandingWorkflow() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'end 40%'],
  });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const progressWidth = useTransform(scaleX, [0, 1], ['0%', '100%']);

  return (
    <section id="workflow" className="landing-section" aria-labelledby="workflow-heading">
      <div className="landing-container">
        <Reveal>
          <p className="landing-eyebrow">Workflow</p>
          <h2
            id="workflow-heading"
            className="landing-display mt-5 max-w-[18ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold"
          >
            From spark to launch narrative.
          </h2>
          <p className="landing-lede mt-6">
            Five disciplined steps. One continuous thread of ownership.
          </p>
        </Reveal>

        <div ref={ref} className="relative mt-16 md:mt-24">
          <div
            className="absolute left-0 top-[1.15rem] hidden h-px w-full bg-[var(--lh-line)] md:block"
            aria-hidden
          />
          <motion.div
            className="absolute left-0 top-[1.15rem] hidden h-px origin-left bg-[var(--lh-ink)] md:block"
            style={{ width: progressWidth }}
            aria-hidden
          />

          <ol className="grid gap-12 md:grid-cols-5 md:gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} as="li" className="relative" delay={i * 0.06}>
                <span
                  className="relative z-10 mb-6 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--lh-ink)] bg-[var(--lh-bg)] text-[10px] font-semibold"
                  aria-hidden
                >
                  {step.n}
                </span>
                <h3 className="landing-display text-xl font-semibold md:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--lh-muted)]">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
