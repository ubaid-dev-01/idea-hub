'use client';

import { MessageCircle, Rocket, Send } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { LANDING_IMAGES } from '@/data/landing-media';

import { LandingImage } from './LandingImage';
import { LandingSection } from './LandingSection';

const steps = [
  {
    step: '01',
    title: 'Post your idea',
    body: 'Capture the problem, hypothesis, and constraints in one place. Attach media, set visibility, and publish when you are ready.',
    icon: Send,
    image: LANDING_IMAGES.stepPost,
    alt: 'Posting an idea on Idea Hub',
    imageRound: 'none' as const,
  },
  {
    step: '02',
    title: 'Get structured feedback',
    body: 'Comments, reactions, and collaboration requests roll into a single timeline. Filter noise and iterate without losing context.',
    icon: MessageCircle,
    image: LANDING_IMAGES.stepFeedback,
    alt: 'Structured feedback and comments on ideas',
    imageRound: 'none' as const,
  },
  {
    step: '03',
    title: 'Build & launch',
    body: 'Promote validated concepts to your network, marketplace, or investor pipeline. Double down where the signal compounds.',
    icon: Rocket,
    image: LANDING_IMAGES.stepLaunch,
    alt: 'Launching a validated idea',
    imageRound: 'none' as const,
  },
] as const;

export function LandingHowItWorks() {
  const reduce = useReducedMotion();

  return (
    <LandingSection
      id="how-heading"
      tone="default"
      shell="none"
      ariaLabelledBy="how-heading-title"
      className="scroll-mt-24 border-b border-slate-200/80 dark:border-slate-800"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="landing-section-kicker">Workflow</p>
        <h2
          id="how-heading-title"
          className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl"
        >
          How it works
        </h2>
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Three disciplined steps from first post to launch-ready narrative.
        </p>
      </motion.div>

      <ol className="mt-16 space-y-16 md:space-y-20">
        {steps.map((item, i) => (
          <motion.li
            key={item.step}
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55 }}
            className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''}`}
          >
            <div
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/50"
            >
              <LandingImage
                src={item.image}
                alt={item.alt}
                className="absolute inset-0"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-800 dark:text-indigo-200">
                <item.icon className="h-4 w-4" aria-hidden />
                Step {item.step}
              </span>
              <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
                {item.title}
              </h3>
              <p className="mt-4 text-slate-600 dark:text-slate-400 md:text-lg">{item.body}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </LandingSection>
  );
}
