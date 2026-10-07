'use client';

import { Reveal } from '../motion/Reveal';
import { useAnimatedCounter } from '../useAnimatedCounter';

const STATS = [
  { value: 48000, suffix: '+', label: 'Ideas shared' },
  { value: 12000, suffix: '+', label: 'Active members' },
  { value: 2100, suffix: '+', label: 'Successfully launched' },
  { value: 94, suffix: '%', label: 'Would recommend' },
];

function StatItem({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix: string;
  label: string;
}) {
  const { ref, value: display } = useAnimatedCounter(value, { duration: 1.4 });

  return (
    <div className="text-center md:text-left">
      <p
        ref={ref}
        className="landing-display text-[clamp(2.75rem,6vw,4.5rem)] font-bold tabular-nums tracking-tight text-[var(--lh-ink)]"
      >
        {display.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-[var(--lh-muted)] md:text-base">{label}</p>
    </div>
  );
}

export function LandingStats() {
  return (
    <section
      className="landing-section border-y border-[var(--lh-line)] bg-[var(--lh-surface)]"
      aria-label="Platform statistics"
    >
      <div className="landing-container">
        <Reveal>
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {STATS.map((stat) => (
              <StatItem key={stat.label} {...stat} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
