'use client';

import { memo } from 'react';

import { cn } from '@/components/ui/cn';
import type { IIdea } from '@/types/api';

import { IdeaPostActions } from './IdeaPostActions';
import { IdeaPostCardProvider } from './IdeaPostCardContext';
import { IdeaPostComments } from './IdeaPostComments';
import { IdeaPostContent } from './IdeaPostContent';
import { IdeaPostHeader } from './IdeaPostHeader';
import { IdeaPostMedia } from './IdeaPostMedia';
import { IdeaPostMenu } from './IdeaPostMenu';
import { IdeaPostMetrics } from './IdeaPostMetrics';
import { IdeaPostModals } from './IdeaPostModals';
import { useIdeaPostCardController } from './useIdeaPostCardController';

function IdeaPostCardInner({
  idea,
  currentUserId,
}: {
  idea: IIdea;
  currentUserId?: string;
}) {
  const value = useIdeaPostCardController(idea, currentUserId);
  const { playingId, setPlayingId, ideaHref, isDesktop, commentsOpen } = value;

  return (
    <IdeaPostCardProvider value={value}>
      <article
        className={cn(
          'mb-2 w-full overflow-hidden border-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] dark:border-gray-700',
          'xl:mb-3 xl:rounded-card xl:border xl:shadow-card xl:transition-shadow xl:duration-200 xl:hover:shadow-card-hover'
        )}
      >
        <div className="flex items-start gap-2 px-4 py-3 pb-2 xl:px-6 xl:py-4">
          <IdeaPostHeader />
          <IdeaPostMenu />
        </div>
        <IdeaPostContent />
        <IdeaPostMedia
          idea={idea}
          playingId={playingId}
          setPlayingId={setPlayingId}
          detailHref={ideaHref}
          isDesktop={isDesktop}
        />
        <IdeaPostMetrics />
        <IdeaPostActions />
        {commentsOpen ? <IdeaPostComments /> : null}
        <IdeaPostModals />
      </article>
    </IdeaPostCardProvider>
  );
}

export const IdeaPostCard = memo(IdeaPostCardInner);
