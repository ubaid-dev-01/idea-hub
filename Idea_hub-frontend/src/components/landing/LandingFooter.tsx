import Link from 'next/link';

import { IdeaHubLogo } from '@/components/brand/IdeaHubLogo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { href: '/#features', label: 'Features' },
      { href: '/#workflow', label: 'Workflow' },
      { href: '/#pricing', label: 'Pricing' },
      { href: '/feed', label: 'Explore feed' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy' },
      { href: '/terms', label: 'Terms' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/register', label: 'Sign up' },
      { href: '/login', label: 'Log in' },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--lh-line)]">
      <div className="landing-container py-20 md:py-28">
        <div className="grid gap-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <IdeaHubLogo size={36} />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[var(--lh-muted)]">
              The operating system for early ideas — feedback, validation, matching,
              and launch narratives without diluting your IP or your attention.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--lh-muted)]">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--lh-ink)] transition-opacity hover:opacity-60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col gap-4 border-t border-[var(--lh-line)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--lh-muted)]">
            © {new Date().getFullYear()} Idea Hub. All rights reserved.
          </p>
          <p className="text-sm text-[var(--lh-muted)]">Built for founders who ship.</p>
        </div>
      </div>
    </footer>
  );
}
