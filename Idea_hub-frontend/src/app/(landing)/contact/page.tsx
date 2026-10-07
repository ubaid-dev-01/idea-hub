import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalDocument } from '@/components/landing/LegalDocument';

export const metadata: Metadata = {
  title: 'Contact | Idea Hub',
  description: 'Reach Idea Hub for support, partnerships, press, and enterprise inquiries.',
};

const channels = [
  {
    title: 'General & product',
    email: 'hello@ideahub.com',
    detail: 'Feature questions, account help, and feedback on the core product experience.',
  },
  {
    title: 'Privacy & data rights',
    email: 'privacy@ideahub.com',
    detail: 'Access, deletion, portability, and regulatory correspondence for your personal data.',
  },
  {
    title: 'Security',
    email: 'security@ideahub.com',
    detail: 'Vulnerability reports. Mention severity and reproduction steps; PGP on request.',
  },
  {
    title: 'Press',
    email: 'press@ideahub.com',
    detail: 'Media kits, executive commentary, and factual statements about Idea Hub.',
  },
  {
    title: 'Legal',
    email: 'legal@ideahub.com',
    detail: 'Formal notices, subpoenas, and contract routing (please include reference numbers).',
  },
] as const;

export default function ContactPage() {
  return (
    <LegalDocument
      title="Contact"
      updated="April 6, 2026"
      currentPage="contact"
      heroDescription="We read every message. Route your note to the right inbox so you get a precise answer — not a ticket black hole."
    >
      <p>
        Idea Hub is built for builders who move fast but still expect thoughtful replies. Whether you
        are reporting a bug, exploring a partnership, or exercising a privacy right: clear subject
        lines and concrete details get you to resolution faster.
      </p>

      <h2>Response times</h2>
      <ul>
        <li>
          <strong>General &amp; product:</strong> typically within one business day (Pacific time).
        </li>
        <li>
          <strong>Privacy &amp; legal:</strong> up to three business days for first acknowledgment;
          complex requests may follow statutory timelines in your region.
        </li>
        <li>
          <strong>Security:</strong> critical issues are triaged immediately; we may coordinate
          disclosure for fixes.
        </li>
      </ul>

      <h2>Channels</h2>
      <p className="!mb-8">
        Click any address to open your mail client. For policy context, see our{' '}
        <Link href="/privacy">Privacy Policy</Link> and <Link href="/terms">Terms of Service</Link>.
      </p>
      <ul className="not-prose divide-y divide-[var(--lh-line)] border-y border-[var(--lh-line)]">
        {channels.map((c) => (
          <li key={c.email} className="py-6">
            <p className="landing-display text-lg font-semibold text-[var(--lh-ink)]">{c.title}</p>
            <a
              href={`mailto:${c.email}`}
              className="mt-1 inline-block text-sm font-medium text-[var(--lh-ink)] underline underline-offset-4 transition-opacity hover:opacity-60"
            >
              {c.email}
            </a>
            <p className="mt-2 text-sm leading-relaxed text-[var(--lh-muted)]">{c.detail}</p>
          </li>
        ))}
      </ul>

      <h2>Before you write</h2>
      <ul>
        <li>
          <strong>Account access:</strong> use in-app recovery first; include the email on the
          account if you still need human help.
        </li>
        <li>
          <strong>Abuse:</strong> use the reporting tools on posts and profiles so moderators have
          context and message IDs.
        </li>
        <li>
          <strong>Ideas &amp; IP:</strong> we cannot review unsolicited investment decks sent by
          email — publish under the visibility you choose on the platform.
        </li>
      </ul>

      <h2>Headquarters</h2>
      <p>
        Idea Hub Inc.
        <br />
        548 Market Street, Suite 3200
        <br />
        San Francisco, CA 94104
        <br />
        United States
      </p>
      <p className="text-sm text-[var(--lh-muted)]">
        Registered agent and full corporate details are provided to customers under contract. For
        vendor onboarding, mention your company domain and expected contract value.
      </p>

      <h2>Social</h2>
      <ul>
        <li>
          <a href="https://twitter.com/ideahub" target="_blank" rel="noopener noreferrer">
            Twitter / X (@ideahub)
          </a>
        </li>
        <li>
          <a
            href="https://www.linkedin.com/company/ideahub"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn (Idea Hub)
          </a>
        </li>
      </ul>

      <h2>Company</h2>
      <p>
        Learn how we think about trust and roadmap on the <Link href="/about">About</Link> page. For
        data handling, read <Link href="/privacy">Privacy</Link>; for rules of use, see{' '}
        <Link href="/terms">Terms</Link>.
      </p>
    </LegalDocument>
  );
}
