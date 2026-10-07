'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useInfiniteScroll(
  onLoadMore: () => void,
  options: { enabled?: boolean; rootMargin?: string } = {}
) {
  const { enabled = true, rootMargin = '200px' } = options;
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [e] = entries;
      if (e?.isIntersecting) onLoadMore();
    },
    [onLoadMore]
  );

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin,
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [enabled, handleIntersect, rootMargin]);

  return sentinelRef;
}
