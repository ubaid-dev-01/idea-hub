'use client';

import { memo, useCallback } from 'react';
import toast from 'react-hot-toast';

import { cn } from '@/components/ui/cn';
import { useShareIdea } from '@/hooks/useIdeas';
import { ICONS } from '@/lib/icons';

import { REACTIONS } from './constants';
import { useIdeaPostCard } from './IdeaPostCardContext';

function IdeaPostActionsInner() {
  const {
    idea,
    token,
    liked,
    saved,
    fullUrl,
    heartAnim,
    floatLike,
    reactionOpen,
    setReactionOpen,
    pickedReaction,
    setPickedReaction,
    shareOpen,
    setShareOpen,
    setCollabOpen,
    setCommentsOpen,
    onLikeClick,
    onLikeMouseDown,
    onLikeMouseUp,
    onLikeMouseLeave,
    onLikeTouchStart,
    onLikeTouchEnd,
    onLikeButtonClick,
    saveMut,
  } = useIdeaPostCard();

  const shareMut = useShareIdea(idea._id);

  const recordShare = useCallback(
    (source: string) => {
      if (!token) {
        toast.error('Log in to share');
        return;
      }
      void shareMut
        .mutateAsync(source)
        .then(() => toast.success('Shared'))
        .catch(() => toast.error('Share failed'));
    },
    [shareMut, token]
  );

  return (
    <>
      <div className="grid grid-cols-4 border-t border-[var(--color-border)] dark:border-gray-700">
        <div className="relative flex justify-center">
          {reactionOpen ? (
            <div className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 shadow-xl dark:bg-[#242526]">
              {REACTIONS.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  title={r.label}
                  className="rounded-full p-1.5 transition hover:scale-110 hover:bg-surface2 dark:hover:bg-[#1f2021]"
                  onClick={() => {
                    setReactionOpen(false);
                    setPickedReaction(r.key);
                    if (!liked) onLikeClick();
                  }}
                >
                  <r.Icon className={cn('h-5 w-5', r.className)} />
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className={cn(
              'post-action-btn min-h-11 py-3 xl:py-2',
              liked && 'text-red-500'
            )}
            onMouseDown={onLikeMouseDown}
            onMouseUp={onLikeMouseUp}
            onMouseLeave={onLikeMouseLeave}
            onTouchStart={onLikeTouchStart}
            onTouchEnd={onLikeTouchEnd}
            onClick={onLikeButtonClick}
          >
            <span className="relative">
              {pickedReaction ? (
                (() => {
                  const r = REACTIONS.find((x) => x.key === pickedReaction);
                  return r ? (
                    <r.Icon className={cn('h-5 w-5', r.className)} />
                  ) : (
                    <ICONS.like className="text-gray-500 dark:text-gray-400" />
                  );
                })()
              ) : (
                <ICONS.like
                  className={cn(
                    heartAnim && 'animate-heart-beat',
                    liked
                      ? 'fill-red-500 text-red-500'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                  fill={liked ? 'currentColor' : 'none'}
                />
              )}
              {floatLike && liked ? (
                <span className="animate-float-up pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500">
                  +1
                </span>
              ) : null}
            </span>
            <span className="hidden sm:inline">{liked ? 'Liked' : 'Like'}</span>
          </button>
        </div>
        <button
          type="button"
          className="post-action-btn min-h-11 py-3 xl:py-2"
          onClick={() => setCommentsOpen((c) => !c)}
        >
          <ICONS.comment />
          <span className="hidden sm:inline">Comment</span>
        </button>
        <div className="relative flex justify-center">
          <button
            type="button"
            className="post-action-btn min-h-11 w-full py-3 xl:py-2"
            onClick={() => setShareOpen((s) => !s)}
          >
            <ICONS.share />
            <span className="hidden sm:inline">Share</span>
          </button>
          {shareOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close"
                onClick={() => setShareOpen(false)}
              />
              <ul className="absolute bottom-full left-1/2 z-20 mb-1 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl dark:bg-[#242526]">
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface2"
                    onClick={() => {
                      setShareOpen(false);
                      recordShare('feed');
                    }}
                  >
                    Share to profile
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-surface2"
                    onClick={() => {
                      setShareOpen(false);
                      void navigator.clipboard.writeText(fullUrl);
                      if (token) recordShare('feed');
                      toast.success('Link copied');
                    }}
                  >
                    Copy link
                  </button>
                </li>
                <li>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(fullUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-3 py-2 text-sm hover:bg-surface2"
                    onClick={() => {
                      setShareOpen(false);
                      if (token) recordShare('feed');
                    }}
                  >
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block px-3 py-2 text-sm hover:bg-surface2"
                    onClick={() => {
                      setShareOpen(false);
                      if (token) recordShare('feed');
                    }}
                  >
                    Twitter / X
                  </a>
                </li>
              </ul>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className="post-action-btn min-h-11 py-3 xl:py-2"
          onClick={() => {
            if (!token) {
              toast.error('Log in to save');
              return;
            }
            void saveMut.mutateAsync({ saved }).catch(() => undefined);
          }}
        >
          <ICONS.bookmark
            className={cn(saved && 'fill-brand text-brand dark:text-indigo-400')}
            fill={saved ? 'currentColor' : 'none'}
          />
          <span className="hidden sm:inline">Save</span>
        </button>
      </div>

      {idea.collaboratorsOpen ? (
        <div className="border-t border-[var(--border)] px-3 py-2 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setCollabOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/15 py-2 text-sm font-bold text-accent dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            <ICONS.collaborate />
            Collaborate
          </button>
        </div>
      ) : null}
    </>
  );
}

export const IdeaPostActions = memo(IdeaPostActionsInner);
