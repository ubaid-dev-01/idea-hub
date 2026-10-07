'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { useAnimatedCounter } from './useAnimatedCounter';

const stats = [
  { label: 'Ideas shared', value: 24891, suffix: '+' },
  { label: 'Active members', value: 8432, suffix: '' },
  { label: 'Successfully launched', value: 1204, suffix: '' },
] as const;

export function LandingStatsBar() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-label="Platform statistics"
      className="relative border-y border-slate-200 bg-slate-50 py-12 dark:border-slate-800 dark:bg-slate-900/30 md:py-14"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:grid-cols-3 sm:gap-8 md:px-6">
        {stats.map((s, i) => (
          <StatItem
            key={s.label}
            target={s.value}
            suffix={s.suffix}
            label={s.label}
            index={i}
            reduce={reduce}
          />
        ))}
      </div>
    </section>
  );
}

function StatItem({
  target,
  suffix,
  label,
  index,
  reduce,
}: {
  target: number;
  suffix: string;
  label: string;
  index: number;
  reduce: boolean | null;
}) {
  const { ref, value } = useAnimatedCounter(target, { duration: 2.4 });

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="text-center"
    >
      <p
        ref={ref}
        className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl"
      >
        {value.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
        {label}
      </p>
    </motion.div>
  );
}
