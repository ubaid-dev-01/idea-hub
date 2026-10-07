import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDocument } from '@/components/landing/LegalDocument';

export const metadata: Metadata = {
  title: 'About | Idea Hub',
  description:
    'Mission, vision, team, and roadmap: how Idea Hub democratizes innovation for builders worldwide.',
};

const team = [
  {
    name: 'Daniel Okoro',
    role: 'CEO & Co-founder',
    bio: 'Former product lead at two B2B unicorns; obsessed with feedback loops between builders and capital.',
    initials: 'DO',
  },
  {
    name: 'Sarah Lindqvist',
    role: 'CTO & Co-founder',
    bio: 'Distributed systems and trust & safety background; previously scaled realtime infra to 50M MAU.',
    initials: 'SL',
  },
  {
    name: 'Michael Torres',
    role: 'Head of Community',
    bio: 'Built creator programs at major platforms; ensures Idea Hub stays constructive under growth.',
    initials: 'MT',
  },
  {
    name: 'Yuki Tanaka',
    role: 'Head of Design',
    bio: 'Information architecture for complex workflows; led design systems for global SaaS products.',
    initials: 'YT',
  },
] as const;

const timeline = [
  {
    year: '2022',
    title: 'Prototype & closed alpha',
    detail:
      'Interviewed hundreds of founders and researchers. Ran a closed alpha with design partners to validate posting, commenting, and lightweight validation workflows.',
  },
  {
    year: '2023',
    title: 'Public beta',
    detail:
      'Launched the public feed, collaboration requests, reputation signals, and a first-pass moderation stack.',
  },
  {
    year: '2024',
    title: 'Enterprise pilots',
    detail:
      'SOC 2 readiness, private workspaces for innovation labs, and APIs for portfolio review.',
  },
  {
    year: '2025',
    title: 'Scale & marketplace',
    detail:
      'Expanded payouts, regional hosting options, and tooling for investors and accelerators.',
  },
  {
    year: '2026',
    title: 'Global expansion',
    detail:
      'Localized policy packs, deeper integrations, and a partner ecosystem for education and nonprofit programs.',
  },
] as const;

export default function AboutPage() {
  return (
    <LegalDocument
      title="About Idea Hub"
      updated="April 6, 2026"
      currentPage="about"
      heroDescription="We are building the place where rough concepts meet honest feedback, aligned collaborators, and launch-ready clarity — before a slide deck locks you in."
    >
      <h2>Mission</h2>
      <p className="!mt-0 text-lg font-medium leading-relaxed text-[var(--lh-ink)] md:text-xl">
        Democratize innovation by connecting raw ideas with real builders, capital, and
        accountability — without forcing every concept into a pitch deck before its time.
      </p>
      <p>
        Most ideas fail quietly: not because they were bad, but because the right people never saw
        them at the right moment. Idea Hub exists to shorten that distance, publicly or privately,
        so momentum can compound while you still have room to pivot.
      </p>

      <h2>Vision</h2>
      <p>
        A world where no great idea dies unnoticed — not because every idea succeeds, but because
        the right people can find it, stress-test it, and carry it forward while the window is still
        open.
      </p>
      <p>
        We imagine a network that feels as serious as LinkedIn for careers and as alive as the best
        creative communities — without the noise of generic social feeds or the gatekeeping of closed
        innovation silos.
      </p>

      <h2>Who we serve</h2>
      <ul>
        <li>
          <strong>Founders &amp; indie builders</strong> who want structured feedback before they
          commit runway, hire, or raise.
        </li>
        <li>
          <strong>Product designers, engineers, and researchers</strong> who enjoy sharpening
          concepts and spotting patterns across domains.
        </li>
        <li>
          <strong>Accelerators, studios, and enterprise innovation teams</strong> who need visibility
          into early thinking — with permissions that match how they already work (
          <Link href="/contact">talk to us</Link> about pilots).
        </li>
      </ul>

      <h2>What we believe</h2>
      <ul>
        <li>Transparency beats stealth when you are hunting for aligned collaborators.</li>
        <li>Moderation and clear rules beat growth-at-all-costs when you want institutional trust.</li>
        <li>Founders deserve signal, not vanity metrics, before they commit runway.</li>
        <li>
          Your ideas stay yours: visibility is intentional, and{' '}
          <Link href="/privacy">privacy</Link> is explainable in plain language.
        </li>
      </ul>

      <h2>How we are different</h2>
      <p>
        Idea Hub is not a generic forum and not a slide repository. Posts are structured for
        critique: context, constraints, and “what would change your mind” prompts — so feedback is
        actionable, not performative. Matching and validation tools sit on top of that signal.
      </p>

      <h2>Leadership</h2>
      <p>
        We are a distributed company with hubs in North America and Europe. Below are representative
        leaders; full org charts are shared with enterprise customers under NDA.
      </p>
      <ul className="not-prose mt-10 grid gap-10 sm:grid-cols-2">
        {team.map((m) => (
          <li key={m.name} className="flex gap-4 border-t border-[var(--lh-line)] pt-6">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--lh-surface)] text-sm font-semibold text-[var(--lh-ink)]"
              aria-hidden
            >
              {m.initials}
            </div>
            <div className="min-w-0">
              <p className="landing-display text-lg font-semibold text-[var(--lh-ink)]">{m.name}</p>
              <p className="mt-0.5 text-sm text-[var(--lh-accent)]">{m.role}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--lh-muted)]">{m.bio}</p>
            </div>
          </li>
        ))}
      </ul>

      <h2>Roadmap snapshot</h2>
      <p>
        Dates are directional; we ship in slices. See also our <Link href="/terms">Terms</Link> for
        how features may evolve.
      </p>
      <ol className="not-prose mt-10 space-y-10 border-l border-[var(--lh-line)] pl-8">
        {timeline.map((t) => (
          <li key={t.year} className="relative">
            <span
              className="absolute -left-[2.15rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--lh-ink)] bg-[var(--lh-bg)]"
              aria-hidden
            />
            <p className="text-xs font-medium tracking-[0.14em] text-[var(--lh-accent)]">{t.year}</p>
            <p className="landing-display mt-1 text-lg font-semibold text-[var(--lh-ink)]">
              {t.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--lh-muted)]">{t.detail}</p>
          </li>
        ))}
      </ol>

      <h2>Contact</h2>
      <p>
        Press, partnerships, and enterprise procurement:{' '}
        <a href="mailto:hello@ideahub.com">hello@ideahub.com</a>
        <br />
        Privacy requests: <a href="mailto:privacy@ideahub.com">privacy@ideahub.com</a>
        <br />
        General questions: <Link href="/contact">Contact page</Link>
      </p>
    </LegalDocument>
  );
}
