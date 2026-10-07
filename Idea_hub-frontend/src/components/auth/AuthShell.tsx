'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { IdeaHubMark } from '@/components/brand/IdeaHubLogo';
import { LANDING_LOTTIE } from '@/data/landing-lottie';
import { LottiePlayer } from '@/components/landing/LottiePlayer';

const PANEL_COPY = {
  login: {
    kicker: 'Welcome back',
    brandLine: 'Idea Hub',
    title: 'Sign in to continue.',
    subtitle: 'Access your feed, private workspaces, and saved ideas.',
    lottie: LANDING_LOTTIE.workspace,
    lottieLabel: 'Workspace animation',
    points: [
      'Pick up drafts and collaborations where you left off',
      'Review feedback on your published ideas',
      'Manage listings and team workspaces',
    ],
  },
  register: {
    kicker: 'Get started',
    brandLine: 'Idea Hub',
    title: 'Create your account.',
    subtitle: 'Join founders and operators building with intent.',
    lottie: LANDING_LOTTIE.community,
    lottieLabel: 'Community collaboration animation',
    points: [
      'Publish publicly or keep ideas private',
      'Match with collaborators by intent',
      'Free to start — no credit card required',
    ],
  },
} as const;

type Variant = keyof typeof PANEL_COPY;

type Props = {
  variant: Variant;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ variant, children, footer }: Props) {
  const copy = PANEL_COPY[variant];
  const reduce = useReducedMotion();

  return (
    <section
      className="relative min-h-[calc(100svh-4rem)] border-b border-[var(--lh-line)]"
      aria-labelledby="auth-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 45% at 20% 10%, var(--lh-accent-soft), transparent 55%)',
        }}
      />

      <div className="landing-container relative grid lg:min-h-[calc(100svh-4rem)] lg:grid-cols-2 lg:gap-16">
        {/* Left — brand story */}
        <div className="hidden flex-col justify-center py-16 lg:flex">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="landing-display flex items-center gap-3 text-[clamp(2.5rem,5vw,3.75rem)] font-bold text-[var(--lh-ink)]">
              <IdeaHubMark size={44} />
              {copy.brandLine}
            </p>
            <h2 className="landing-display mt-6 max-w-[14ch] text-[clamp(1.5rem,2.5vw,2rem)] font-semibold text-[var(--lh-ink)]">
              {copy.title}
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--lh-muted)]">
              {copy.subtitle}
            </p>
            <ul className="mt-10 space-y-4">
              {copy.points.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-[15px] leading-relaxed text-[var(--lh-muted)]"
                >
                  <span
                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--lh-accent)]"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 max-w-sm"
          >
            <LottiePlayer
              src={copy.lottie}
              className="aspect-square w-full"
              aria-label={copy.lottieLabel}
            />
          </motion.div>
        </div>

        {/* Right — form */}
        <div className="flex items-center justify-center py-16 md:py-20">
          <motion.div
            className="w-full max-w-[420px]"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="landing-eyebrow">{copy.kicker}</p>
            <h1
              id="auth-heading"
              className="landing-display mt-4 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-[var(--lh-ink)]"
            >
              {variant === 'login' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--lh-muted)]">
              {variant === 'login'
                ? 'Enter your credentials to continue.'
                : 'A few details and you are ready to ship ideas.'}
            </p>

            <div className="mt-9">{children}</div>

            <div className="mt-8 text-center text-sm text-[var(--lh-muted)]">
              {footer}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
