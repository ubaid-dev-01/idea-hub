'use client';

import { animate, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export function useAnimatedCounter(
  target: number,
  options?: { duration?: number; enabled?: boolean }
) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [value, setValue] = useState(0);
  const duration = options?.duration ?? 2.2;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled || !isInView) return;
    const controls = animate(0, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [isInView, target, duration, enabled]);

  return { ref, value };
}
