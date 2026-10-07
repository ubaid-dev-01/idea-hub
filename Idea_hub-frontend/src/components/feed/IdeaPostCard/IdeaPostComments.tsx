'use client';

import Image from 'next/image';
import { useVirtualizer } from '@tanstack/react-virtual';
import { memo, useRef } from 'react';

import { cn } from '@/components/ui/cn';
import { ICONS } from '@/lib/icons';
import { resolveAuthor } from '@/lib/author';

import { CommentRow } from './CommentRow';
import { useIdeaPostCard } from './IdeaPostCardContext';

const VIRTUAL_THRESHOLD = 10;

function IdeaPostCommentsInner() {
  const {
    me,
    commentText,
    setCommentText,
    commentFocused,
    setCommentFocused,
    replyTo,
    setReplyTo,
    sendSpin,
    submitComment,
    addComment,
    commentsQ,
    visibleComments,
    repliesOpen,
    setRepliesOpen,
  } = useIdeaPostCard();

  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtual = visibleComments.length > VIRTUAL_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? visibleComments.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 6,
  });

  const replyHandlers = (comment: (typeof visibleComments)[number]) => ({
    onReply: (ch: typeof comment) => {
      const u = resolveAuthor(ch.authorId);
      setReplyTo({
        id: ch._id,
        username: u?.username ?? 'user',
      });
      setCommentFocused(true);
    },
    repliesOpen: repliesOpen[comment._id] ?? false,
    onToggleReplies: () =>
      setRepliesOpen((m) => ({
        ...m,
        [comment._id]: !m[comment._id],
      })),
  });

  return (
    <div className="border-t border-[var(--border)] bg-surface2/40 px-3 py-3 dark:border-slate-700/50 dark:bg-black/20">
      <div className="flex gap-2">
        <div className="relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface2">
          {me?.avatarUrl ? (
            <Image
              src={me.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {replyTo ? (
            <p className="mb-1 text-xs text-[var(--text-muted)]">
              Replying to @{replyTo.username}
              <button
                type="button"
                className="ml-2 font-semibold text-brand"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </button>
            </p>
          ) : null}
          <input
            className="w-full rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm dark:border-slate-700/50 dark:bg-[#242526]"
            placeholder="Write a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onFocus={() => setCommentFocused(true)}
            onBlur={() =>
              window.setTimeout(() => setCommentFocused(false), 150)
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submitComment();
              }
            }}
          />
          {commentFocused ? (
            <div className="mt-2 flex items-center justify-end gap-2">
              <button type="button" className="p-2 text-[var(--text-muted)]">
                <ICONS.smile size={20} />
              </button>
              <button type="button" className="p-2 text-[var(--text-muted)]">
                <ICONS.image size={20} />
              </button>
              <button
                type="button"
                onClick={() => void submitComment()}
                disabled={!commentText.trim() || addComment.isPending}
                className={cn(
                  'rounded-full p-2 text-brand disabled:opacity-40',
                  sendSpin && 'animate-spin'
                )}
              >
                <ICONS.next className="rotate-[-90deg]" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {useVirtual ? (
        <div
          ref={parentRef}
          className="mt-4 max-h-96 overflow-auto"
          style={{ contain: 'strict' }}
        >
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((v) => {
              const c = visibleComments[v.index]!;
              const h = replyHandlers(c);
              return (
                <div
                  key={c._id}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    transform: `translateY(${v.start}px)`,
                    height: v.size,
                  }}
                >
                  <CommentRow
                    c={c}
                    asDiv
                    onReply={h.onReply}
                    repliesOpen={h.repliesOpen}
                    onToggleReplies={h.onToggleReplies}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visibleComments.map((c) => {
            const h = replyHandlers(c);
            return (
              <CommentRow
                key={c._id}
                c={c}
                onReply={h.onReply}
                repliesOpen={h.repliesOpen}
                onToggleReplies={h.onToggleReplies}
              />
            );
          })}
        </ul>
      )}

      {commentsQ.hasNextPage ? (
        <button
          type="button"
          className="mt-3 w-full py-2 text-sm font-semibold text-brand dark:text-indigo-400"
          onClick={() => void commentsQ.fetchNextPage()}
          disabled={commentsQ.isFetchingNextPage}
        >
          {commentsQ.isFetchingNextPage
            ? 'Loading…'
            : 'View more comments'}
        </button>
      ) : null}
    </div>
  );
}

export const IdeaPostComments = memo(IdeaPostCommentsInner);
