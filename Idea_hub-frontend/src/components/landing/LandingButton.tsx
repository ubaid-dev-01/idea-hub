import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

type LandingButtonProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
  external?: boolean;
};

const styles: Record<Variant, string> = {
  primary:
    'bg-[var(--lh-ink)] text-[var(--lh-bg)] hover:bg-[var(--lh-ink-soft)] focus-visible:ring-[var(--lh-ink)]',
  secondary:
    'border border-[var(--lh-line)] bg-transparent text-[var(--lh-ink)] hover:bg-[var(--lh-surface)] focus-visible:ring-[var(--lh-ink)]',
  ghost:
    'text-[var(--lh-muted)] hover:text-[var(--lh-ink)] focus-visible:ring-[var(--lh-ink)]',
};

export function LandingButton({
  href,
  children,
  variant = 'primary',
  className = '',
  external,
}: LandingButtonProps) {
  const classNames = [
    'landing-btn inline-flex min-h-[48px] items-center justify-center rounded-full px-7 text-sm font-medium tracking-tight transition-[transform,colors] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lh-bg)] hover:-translate-y-px active:scale-[0.985]',
    styles[variant],
    className,
  ].join(' ');

  if (external) {
    return (
      <a href={href} className={classNames} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classNames}>
      {children}
    </Link>
  );
}
