'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

import { cn } from '@/components/ui/cn';
import { pushWithViewTransition } from '@/lib/viewTransitions';

import { useIdeaPostCard } from './IdeaPostCardContext';

function IdeaPostContentInner() {
  const router = useRouter();
  const {
    idea,
    ideaHref,
    isDesktop,
    expandedTitle,
    setExpandedTitle,
    expandedDesc,
    setExpandedDesc,
  } = useIdeaPostCard();

  return (
    <div className="px-4 pb-2 xl:px-6">
      <Link
        href={ideaHref}
        scroll={false}
        onClick={(e) => {
          if (!isDesktop) {
            e.preventDefault();
            pushWithViewTransition(router, ideaHref);
          }
        }}
        className="block"
      >
        <h2
          className={cn(
            'text-base font-semibold leading-snug text-[var(--color-text-primary)] sm:text-lg',
            !expandedTitle && 'line-clamp-2'
          )}
        >
          {idea.title}
        </h2>
      </Link>
      {idea.title.length > 80 ? (
        <button
          type="button"
          className="mt-0.5 text-sm font-semibold text-brand dark:text-indigo-400"
          onClick={() => setExpandedTitle((x) => !x)}
        >
          {expandedTitle ? 'See less' : 'See more'}
        </button>
      ) : null}

      <p
        className={cn(
          'mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]',
          !expandedDesc && 'line-clamp-3'
        )}
      >
        {idea.description}
      </p>
      {idea.location?.trim() ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          📍 {idea.location}
        </p>
      ) : null}
      {idea.aiSummary?.trim() ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
          {idea.aiSummary}
        </p>
      ) : null}
      {idea.description.length > 180 ? (
        <button
          type="button"
          className="mt-1 text-sm font-semibold text-brand dark:text-indigo-400"
          onClick={() => setExpandedDesc((x) => !x)}
        >
          {expandedDesc ? 'See less' : 'See more'}
        </button>
      ) : null}
    </div>
  );
}

export const IdeaPostContent = memo(IdeaPostContentInner);
