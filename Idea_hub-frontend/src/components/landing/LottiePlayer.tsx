'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

type LottiePlayerProps = {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  play?: boolean;
  'aria-label'?: string;
};

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LottiePlayer({
  src,
  className,
  loop = true,
  autoplay = true,
  play = true,
  'aria-label': ariaLabel = 'Decorative animation',
}: LottiePlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [data, setData] = useState<object | null>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduce) return;

    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${src}`);
        return r.json();
      })
      .then((json: object) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src, inView, reduce]);

  if (reduce) {
    return (
      <div
        ref={rootRef}
        className={className}
        role="img"
        aria-label={ariaLabel}
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(15,118,110,0.06), transparent 70%)',
        }}
      />
    );
  }

  if (!data) {
    return (
      <div
        ref={rootRef}
        className={className}
        aria-hidden
        style={{
          minHeight: 120,
          background:
            'radial-gradient(ellipse at center, rgba(15,118,110,0.06), transparent 70%)',
        }}
      />
    );
  }

  return (
    <div ref={rootRef} className={className} role="img" aria-label={ariaLabel}>
      <Lottie
        animationData={data}
        loop={loop}
        autoplay={autoplay && play}
        style={{ width: '100%', height: '100%' }}
        rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      />
    </div>
  );
}
