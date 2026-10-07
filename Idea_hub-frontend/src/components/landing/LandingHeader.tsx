'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { IdeaHubLogo } from '@/components/brand/IdeaHubLogo';

import { LandingThemeToggle } from './LandingThemeToggle';

const nav = [
  { href: '/#problem', label: 'Product' },
  { href: '/#workflow', label: 'Workflow' },
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,backdrop-filter,border-color] duration-300 ${
        scrolled
          ? 'border-b border-[var(--lh-line)] bg-[var(--lh-bg)]/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="landing-container flex h-16 items-center justify-between md:h-[4.25rem]">
        <Link
          href="/"
          className="group transition-opacity hover:opacity-70"
          aria-label="Idea Hub home"
        >
          <IdeaHubLogo size={30} />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-3.5 py-2 text-[13px] font-medium text-[var(--lh-muted)] transition-colors hover:text-[var(--lh-ink)] after:absolute after:inset-x-3.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-[var(--lh-ink)] after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LandingThemeToggle className="h-9 w-9 rounded-full border border-[var(--lh-line)] bg-transparent text-[var(--lh-ink)] hover:bg-[var(--lh-surface)]" />
          <Link
            href="/login"
            className="px-3 py-2 text-[13px] font-medium text-[var(--lh-muted)] transition-colors hover:text-[var(--lh-ink)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex h-10 items-center rounded-full bg-[var(--lh-ink)] px-5 text-[13px] font-medium text-[var(--lh-bg)] transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LandingThemeToggle className="h-9 w-9 rounded-full border border-[var(--lh-line)]" />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lh-line)] text-[var(--lh-ink)]"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-0 z-50 bg-[var(--lh-bg)] lg:hidden"
        >
          <div className="landing-container flex h-16 items-center justify-between">
            <IdeaHubLogo size={30} />
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lh-line)]"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="landing-container flex flex-col gap-1 pt-8" aria-label="Mobile">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="landing-display block py-3 text-3xl font-semibold tracking-tight text-[var(--lh-ink)]"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-10 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--lh-line)] text-sm font-medium"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--lh-ink)] text-sm font-medium text-[var(--lh-bg)]"
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
