'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';

import { LANDING_IMAGES } from '@/data/landing-media';

import { LandingImage } from './LandingImage';

export function LandingHeroPro() {
  const reduce = useReducedMotion();

  return (
    <section
      className="landing-hero-mesh relative px-4 pb-8 pt-6 md:px-6 md:pb-12 md:pt-10"
      aria-labelledby="landing-hero-heading"
    >
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        <div className="max-w-xl lg:max-w-none">
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="landing-pill"
          >
            Social platform · Ideas · Collaboration
          </motion.p>
          <motion.h1
            id="landing-hero-heading"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl xl:text-[3.5rem] xl:leading-[1.05]"
          >
            Turn Your Spark Into a{' '}
            <span className="bg-gradient-to-r from-indigo-700 via-violet-700 to-emerald-700 bg-clip-text text-transparent dark:from-indigo-300 dark:via-violet-300 dark:to-emerald-300">
              Movement
            </span>
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-6 text-lg leading-relaxed text-slate-700 dark:text-slate-300 md:text-xl"
          >
            Join <strong className="font-semibold text-slate-900 dark:text-white">12,000+</strong>{' '}
            innovators sharing, refining, and launching ideas daily. Public feeds, private workspaces,
            collaboration requests, and marketplace listings — one platform for serious ideation.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <Link href="/register" className="landing-btn-primary">
              Start Sharing
            </Link>
            <Link href="/feed" className="landing-btn-secondary">
              Explore Ideas
            </Link>
          </motion.div>
          <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
            Free to start · No credit card · Built for founders, researchers, and operators
          </p>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/60">
            <LandingImage
              src={LANDING_IMAGES.heroTeam}
              alt="Idea Hub platform dashboard with idea feed and collaboration tools"
              className="absolute inset-0 h-full w-full"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-slate-900/75 p-4">
              <p className="text-xs font-medium text-white/95 md:text-sm">
                “We shipped our MVP narrative in two weeks, entirely from threads on Idea Hub.”
              </p>
              <p className="mt-1 text-[10px] text-white/70 md:text-xs">
                Product lead, B2B SaaS · verified member
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
