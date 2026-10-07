'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const LottiePlayer = dynamic(
  () =>
    import('../LottiePlayer').then((m) => ({ default: m.LottiePlayer })),
  { ssr: false }
);

const visualClass =
  'aspect-square w-full max-w-[640px] md:max-w-[720px] lg:max-w-[780px]';

const placeholderStyle = {
  background:
    'radial-gradient(ellipse at center, rgba(15,118,110,0.08), transparent 70%)',
} as const;

export function HeroVisual({ src }: { src: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(enable, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const t = setTimeout(enable, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  if (!ready) {
    return <div className={visualClass} aria-hidden style={placeholderStyle} />;
  }

  return (
    <LottiePlayer
      src={src}
      className={visualClass}
      aria-label="Abstract animation of ideas forming and connecting"
    />
  );
}
