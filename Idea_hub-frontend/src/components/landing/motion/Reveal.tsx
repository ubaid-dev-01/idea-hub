'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  /** Use `li` when Reveal is a direct child of `ul`/`ol` so list structure stays valid. */
  as?: 'div' | 'li';
};

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
  as = 'div',
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    if (as === 'li') {
      return <li className={className}>{children}</li>;
    }
    return <div className={className}>{children}</div>;
  }

  const motionProps = {
    className,
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once, margin: '-8% 0px -8% 0px' as const },
    transition: {
      duration: 0.7,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  };

  if (as === 'li') {
    return <motion.li {...motionProps}>{children}</motion.li>;
  }

  return <motion.div {...motionProps}>{children}</motion.div>;
}
