'use client';

import Image from 'next/image';
import { memo } from 'react';

import { resolveAuthor } from '@/lib/author';
import { formatRelative } from '@/lib/utils';
import type { IComment } from '@/types/api';

import { timeAgoShort } from './constants';

function CommentRowInner({
  c,
  onReply,
  repliesOpen,
  onToggleReplies,
  asDiv,
}: {
  c: IComment;
  onReply: (comment: IComment) => void;
  repliesOpen: boolean;
  onToggleReplies: () => void;
  /** Use for virtualized lists (non-semantic wrapper) */
  asDiv?: boolean;
}) {
  const author = resolveAuthor(c.authorId);
  const replies = c.replies ?? [];
  const W = asDiv ? 'div' : 'li';

  return (
    <W>
      <div className="flex gap-2">
        <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface2">
          {author?.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-block max-w-full rounded-2xl bg-gray-100 px-3 py-2 dark:bg-[#242526]">
            <p className="text-xs font-bold text-[var(--text)]">
              {author?.fullName ?? 'User'}
            </p>
            <p className="text-sm text-[var(--text)]">{c.content}</p>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span title={formatRelative(c.createdAt)}>
              {timeAgoShort(c.createdAt)}
            </span>
            <button type="button" className="font-semibold hover:underline">
              Like
            </button>
            <button
              type="button"
              className="font-semibold hover:underline"
              onClick={() => onReply(c)}
            >
              Reply
            </button>
            {c.likeCount > 0 ? <span>{c.likeCount} likes</span> : null}
          </div>
          {replies.length > 0 ? (
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-[var(--text-muted)] hover:underline"
              onClick={onToggleReplies}
            >
              {repliesOpen
                ? 'Hide replies'
                : `View ${replies.length} replies ▾`}
            </button>
          ) : null}
          {repliesOpen ? (
            <ul className="ml-4 mt-2 space-y-2 border-l border-[var(--border)] pl-3 dark:border-slate-700/50">
              {replies.map((r) => (
                <CommentRowInner
                  key={r._id}
                  c={r}
                  onReply={(ch) => onReply(ch)}
                  repliesOpen={false}
                  onToggleReplies={() => undefined}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </W>
  );
}

export const CommentRow = memo(CommentRowInner);
