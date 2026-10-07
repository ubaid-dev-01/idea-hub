'use client';

import { LayoutGrid, Lock, Sparkles, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

import { LANDING_IMAGES } from '@/data/landing-media';

import { LandingImage } from './LandingImage';
import { LandingSection } from './LandingSection';

const cards = [
  {
    title: 'Collaborative feedback',
    body: 'Structured threads, mentions, and visibility controls so critique stays actionable, not performative.',
    icon: Users,
    image: LANDING_IMAGES.featureWhiteboard,
    alt: 'Team collaboration on Idea Hub feedback board',
    shell: 'none' as const,
  },
  {
    title: 'AI validation score',
    body: 'Multi-modal scanning surfaces risk, clarity, and policy flags before you go wide.',
    icon: Sparkles,
    image: LANDING_IMAGES.featureAi,
    alt: 'AI validation dashboard for idea scoring',
    shell: 'none' as const,
  },
  {
    title: 'Founder matching',
    body: 'Collaboration requests and discovery tuned for intent, not vanity metrics.',
    icon: LayoutGrid,
    image: LANDING_IMAGES.featureNetwork,
    alt: 'Founder matching network visualization',
    shell: 'none' as const,
  },
  {
    title: 'Public & private workspaces',
    body: 'Draft in private, share with collaborators only, or publish to the open feed.',
    icon: Lock,
    image: LANDING_IMAGES.featureWorkspace,
    alt: 'Public and private workspace split view',
    shell: 'none' as const,
  },
] as const;

export function LandingFeaturesPro() {
  const reduce = useReducedMotion();

  return (
    <LandingSection
      id="features"
      tone="muted"
      shell="none"
      ariaLabelledBy="features-pro-heading"
      className="border-b border-slate-200/80 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl text-center"
      >
        <p className="landing-section-kicker">Platform capabilities</p>
        <h2
          id="features-pro-heading"
          className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl lg:text-5xl"
        >
          Infrastructure for serious ideation
        </h2>
        <p className="mt-5 text-lg text-slate-600 dark:text-slate-400">
          Feedback, validation signal, matching, and governance at every visibility level.
        </p>
      </motion.div>

      <ul className="mt-14 grid gap-8 md:grid-cols-2 lg:gap-10">
        {cards.map((card, i) => (
          <motion.li
            key={card.title}
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, delay: i * 0.06 }}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700/50 dark:bg-slate-900/40"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden">
              <LandingImage
                src={card.image}
                alt={card.alt}
                className="absolute inset-0 h-full w-full"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
            </div>
            <div className="relative p-6 md:p-8">
              <div className="mb-4 inline-flex rounded-xl border border-brand-500/15 bg-brand-500/10 p-3 text-brand-700 dark:border-indigo-400/20 dark:bg-indigo-500/15 dark:text-indigo-200">
                <card.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white md:text-2xl">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-base">
                {card.body}
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </LandingSection>
  );
}
