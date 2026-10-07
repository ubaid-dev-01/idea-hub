import Link from 'next/link';
import type { ReactNode } from 'react';

const RELATED = [
  { href: '/about', label: 'About' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/contact', label: 'Contact' },
] as const;

export type LegalPageId = 'about' | 'privacy' | 'terms' | 'contact';

function LegalRelatedNav({ current }: { current?: LegalPageId }) {
  const items = RELATED.filter((l) => {
    if (!current) return true;
    if (current === 'about' && l.href === '/about') return false;
    if (current === 'privacy' && l.href === '/privacy') return false;
    if (current === 'terms' && l.href === '/terms') return false;
    if (current === 'contact' && l.href === '/contact') return false;
    return true;
  });

  return (
    <nav
      className="not-prose mt-20 border-t border-[var(--lh-line)] pt-10"
      aria-label="Related pages"
    >
      <p className="landing-eyebrow">Continue exploring</p>
      <ul className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="font-medium text-[var(--lh-ink)] underline-offset-4 transition-opacity hover:opacity-60 hover:underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/"
            className="font-medium text-[var(--lh-muted)] underline-offset-4 transition-colors hover:text-[var(--lh-ink)] hover:underline"
          >
            Home
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export function LegalDocument({
  title,
  updated,
  children,
  heroDescription,
  currentPage,
  showRelated = true,
}: {
  title: string;
  updated: string;
  children: ReactNode;
  /** @deprecated Kept for call-site compatibility; hero images removed for a cleaner editorial look. */
  heroImage?: string;
  heroDescription?: string;
  currentPage?: LegalPageId;
  showRelated?: boolean;
}) {
  return (
    <div className="legal-doc">
      <section
        className="relative overflow-hidden border-b border-[var(--lh-line)]"
        aria-labelledby="legal-doc-title"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 50% 0%, var(--lh-accent-soft), transparent 60%)',
          }}
        />

        <div className="landing-container relative pb-14 pt-28 md:pb-20 md:pt-32">
          <Link
            href="/"
            className="inline-flex text-sm font-medium text-[var(--lh-muted)] transition-colors hover:text-[var(--lh-ink)]"
          >
            ← Back to home
          </Link>
          <h1
            id="legal-doc-title"
            className="landing-display mt-8 max-w-[16ch] text-[clamp(2.25rem,5vw,3.75rem)] font-bold text-[var(--lh-ink)]"
          >
            {title}
          </h1>
          <p className="mt-4 text-sm text-[var(--lh-muted)]">Last updated: {updated}</p>
          {heroDescription ? (
            <p className="landing-lede mt-6 max-w-2xl">{heroDescription}</p>
          ) : null}
        </div>
      </section>

      <article className="landing-container py-14 md:py-20">
        <div
          className={[
            'prose prose-neutral mx-auto max-w-3xl dark:prose-invert',
            'prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight',
            'prose-h2:mt-14 prose-h2:mb-4 prose-h2:border-b prose-h2:border-[var(--lh-line)] prose-h2:pb-3 prose-h2:text-xl',
            'prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-base',
            'prose-p:leading-[1.75] prose-p:text-[var(--lh-muted)]',
            'prose-li:my-1.5 prose-li:leading-relaxed prose-li:text-[var(--lh-muted)]',
            'prose-a:text-[var(--lh-ink)] prose-a:font-medium prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-60',
            'prose-strong:text-[var(--lh-ink)]',
          ].join(' ')}
        >
          {children}
        </div>
        {showRelated ? (
          <div className="mx-auto max-w-3xl">
            <LegalRelatedNav current={currentPage} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
