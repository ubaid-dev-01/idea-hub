'use client';

import { memo } from 'react';

import { useIdeaPostCard } from './IdeaPostCardContext';

function IdeaPostMetricsInner() {
  const { idea, shareCount, setLikesOpen, setCommentsOpen } = useIdeaPostCard();

  return (
    <div className="flex flex-wrap items-center gap-1 px-4 py-1 text-sm text-[var(--color-text-muted)] xl:px-6 xl:py-2">
      <button
        type="button"
        className="hover:underline"
        onClick={() => idea.likeCount > 0 && setLikesOpen(true)}
      >
        {idea.likeCount} likes
      </button>
      <span>·</span>
      <button
        type="button"
        className="hover:underline"
        onClick={() => setCommentsOpen(true)}
      >
        {idea.commentCount} comments
      </button>
      {shareCount > 0 ? (
        <>
          <span>·</span>
          <span>{shareCount} shares</span>
        </>
      ) : null}
    </div>
  );
}

export const IdeaPostMetrics = memo(IdeaPostMetricsInner);
