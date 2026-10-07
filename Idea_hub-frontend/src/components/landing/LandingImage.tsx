'use client';

import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/components/ui/cn';

type Props = {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
};

export function LandingImage({
  src,
  alt,
  className,
  imgClassName,
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  fill = true,
  width,
  height,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  if (!fill && width && height) {
    return (
      <span className={cn('relative inline-block overflow-hidden', className)}>
        {!loaded ? (
          <span
            className="block animate-pulse bg-slate-200 dark:bg-slate-800"
            style={{ width, height }}
            aria-hidden
          />
        ) : null}
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-500',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName
          )}
          sizes={sizes}
          priority={priority}
          onLoadingComplete={() => setLoaded(true)}
        />
      </span>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {!loaded ? (
        <div
          className="absolute inset-0 z-10 animate-pulse bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900"
          aria-hidden
        />
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(
          'object-cover transition-opacity duration-700',
          loaded ? 'opacity-100' : 'opacity-0',
          imgClassName
        )}
        sizes={sizes}
        priority={priority}
        onLoadingComplete={() => setLoaded(true)}
      />
    </div>
  );
}
