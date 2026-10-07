'use client';

import { cn } from '@/components/ui/cn';

type CurveVariant = 'wave-right' | 'wave-left' | 'arch-top' | 'arch-bottom' | 'none';

type LandingSectionProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  /** Background treatment */
  tone?: 'default' | 'muted' | 'brand' | 'dark' | 'glass';
  /** Asymmetric shell: one side heavily rounded, opposite square */
  shell?: 'left-round' | 'right-round' | 'both-round' | 'none';
  /** SVG divider at top */
  topCurve?: CurveVariant;
  /** SVG divider at bottom */
  bottomCurve?: CurveVariant;
  ariaLabelledBy?: string;
  ariaLabel?: string;
};

function CurveSvg({
  variant,
  position,
}: {
  variant: Exclude<CurveVariant, 'none'>;
  position: 'top' | 'bottom';
}) {
  const flip = position === 'bottom';
  const paths: Record<Exclude<CurveVariant, 'none' | 'arch-top' | 'arch-bottom'>, string> = {
    'wave-right':
      'M0,64 C360,120 720,0 1200,48 L1200,0 L0,0 Z',
    'wave-left':
      'M0,48 C480,96 840,16 1200,72 L1200,0 L0,0 Z',
  };

  if (variant === 'arch-top' || variant === 'arch-bottom') {
    const d =
      variant === 'arch-top'
        ? 'M0,80 Q600,0 1200,80 L1200,0 L0,0 Z'
        : 'M0,0 Q600,80 1200,0 L1200,80 L0,80 Z';
    return (
      <div
        className={cn(
          'pointer-events-none absolute left-0 right-0 h-16 text-inherit md:h-20',
          flip ? 'bottom-0 translate-y-[99%]' : 'top-0 -translate-y-[99%]'
        )}
        aria-hidden
      >
        <svg
          viewBox="0 0 1200 80"
          preserveAspectRatio="none"
          className={cn('h-full w-full', flip && 'rotate-180')}
        >
          <path d={d} fill="currentColor" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'pointer-events-none absolute left-0 right-0 h-14 text-inherit md:h-20',
        flip ? 'bottom-0 translate-y-full' : 'top-0 -translate-y-full'
      )}
      aria-hidden
    >
      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className={cn('h-full w-full', flip && 'rotate-180')}
      >
        <path d={paths[variant]} fill="currentColor" />
      </svg>
    </div>
  );
}

const toneClasses: Record<NonNullable<LandingSectionProps['tone']>, string> = {
  default: '',
  muted:
    'bg-gradient-to-br from-slate-100/90 via-white to-indigo-50/40 dark:from-slate-900/80 dark:via-slate-950 dark:to-indigo-950/30',
  brand:
    'bg-gradient-to-br from-indigo-600/10 via-violet-600/5 to-emerald-500/10 dark:from-indigo-950/60 dark:via-violet-950/40 dark:to-emerald-950/20',
  dark: 'bg-gradient-to-b from-slate-900 via-slate-950 to-black',
  glass: 'bg-slate-50 dark:bg-slate-900/30',
};

const shellClasses: Record<NonNullable<LandingSectionProps['shell']>, string> = {
  'left-round': 'rounded-r-2xl rounded-l-none md:rounded-r-3xl',
  'right-round': 'rounded-l-2xl rounded-r-none md:rounded-l-3xl',
  'both-round': 'rounded-2xl md:rounded-3xl',
  none: '',
};

export function LandingSection({
  id,
  children,
  className,
  innerClassName,
  tone = 'default',
  shell = 'none',
  topCurve = 'none',
  bottomCurve = 'none',
  ariaLabelledBy,
  ariaLabel,
}: LandingSectionProps) {
  const isShell = shell !== 'none';

  return (
    <section
      id={id}
      className={cn('relative scroll-mt-24 px-4 py-16 md:px-6 md:py-24 lg:py-28', className)}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
    >
      {topCurve !== 'none' ? (
        <CurveSvg variant={topCurve} position="top" />
      ) : null}

      <div
        className={cn(
          isShell && 'mx-auto max-w-[88rem]',
          isShell && shellClasses[shell],
          isShell && toneClasses[tone],
          isShell && 'overflow-hidden border border-slate-200/80 dark:border-slate-700/50'
        )}
      >
        <div
          className={cn(
            isShell ? 'px-6 py-14 md:px-12 md:py-20 lg:px-16' : '',
            innerClassName
          )}
        >
          {children}
        </div>
      </div>

      {bottomCurve !== 'none' ? (
        <CurveSvg variant={bottomCurve} position="bottom" />
      ) : null}
    </section>
  );
}
