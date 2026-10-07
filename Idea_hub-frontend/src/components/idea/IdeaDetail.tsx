'use client';

import { Heart, MessageCircle, Send, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

import { MediaViewer } from '@/components/idea/MediaViewer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useAddComment,
  useCollabRequest,
  useIdeaComments,
  useToggleLike,
  useToggleSave,
} from '@/hooks/useIdeas';
import { resolveAuthor } from '@/lib/author';
import { formatRelative } from '@/lib/utils';
import type { IIdea, IComment } from '@/types/api';
import { useAuthStore } from '@/store/authStore';

export function IdeaDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function CommentTree({
  comments,
  depth = 0,
  onReply,
  replyPending,
}: {
  comments: IComment[];
  depth?: number;
  onReply: (parentId: string, content: string) => Promise<void>;
  replyPending: boolean;
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [text, setText] = useState('');

  return (
    <ul
      className={
        depth
          ? 'ml-6 mt-3 space-y-3 border-l border-[var(--border)] pl-4'
          : 'space-y-4'
      }
    >
      {comments.map((c) => {
        const author = resolveAuthor(c.authorId);
        return (
          <li key={c._id} className="space-y-2">
            <div className="flex gap-2">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface2">
                {author?.avatarUrl ? (
                  <Image
                    src={author.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)]">
                  @{author?.username ?? 'user'}
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {formatRelative(c.createdAt)}
                </p>
                <p className="mt-1 text-[var(--text)]">{c.content}</p>
                {depth === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-auto p-0 text-xs"
                    onClick={() =>
                      setReplyTo((r) => (r === c._id ? null : c._id))
                    }
                  >
                    Reply
                  </Button>
                ) : null}
              </div>
            </div>
            {replyTo === c._id ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!text.trim()) return;
                  void onReply(c._id, text).then(() => {
                    setText('');
                    setReplyTo(null);
                  });
                }}
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write a reply…"
                />
                <Button type="submit" size="sm" loading={replyPending}>
                  Send
                </Button>
              </form>
            ) : null}
            {c.replies?.length ? (
              <CommentTree
                comments={c.replies}
                depth={depth + 1}
                onReply={onReply}
                replyPending={replyPending}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function IdeaDetailView({
  idea,
  currentUserId,
}: {
  idea: IIdea;
  currentUserId?: string;
}) {
  const author = resolveAuthor(idea.authorId);
  const likeMut = useToggleLike(idea._id);
  const [saved, setSaved] = useState(false);
  const saveMut = useToggleSave(idea._id);
  const { data: commentsPages, isLoading: commentsLoading } =
    useIdeaComments(idea._id);
  const addTop = useAddComment(idea._id);
  const collab = useCollabRequest(idea._id);
  const user = useAuthStore((s) => s.user);
  const [topComment, setTopComment] = useState('');
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabMsg, setCollabMsg] = useState('');
  const [collabSkills, setCollabSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const flatComments =
    commentsPages?.pages.flatMap((p) => p.comments) ?? [];

  const handleReply = async (parentId: string, content: string) => {
    await addTop.mutateAsync({ content, parentCommentId: parentId });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="brand">{idea.category}</Badge>
            {idea.collaboratorsOpen ? (
              <Badge variant="accent" className="gap-1">
                <Users className="h-3 w-3" />
                Open for collaborators
              </Badge>
            ) : null}
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)]">{idea.title}</h1>
        </div>
        {currentUserId ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => likeMut.mutate()}
              loading={likeMut.isPending}
            >
              <Heart className="mr-1 h-4 w-4" />
              {idea.likeCount}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const next = !saved;
                setSaved(next);
                void saveMut.mutateAsync({ saved }).catch(() => setSaved(!next));
              }}
              loading={saveMut.isPending}
            >
              Save
            </Button>
          </div>
        ) : null}
      </div>

      {author ? (
        <Link
          href={`/profile/${author.username}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-4"
        >
          <div className="h-12 w-12 overflow-hidden rounded-full bg-surface2">
            {author.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt=""
                width={48}
                height={48}
                className="object-cover"
                unoptimized
              />
            ) : null}
          </div>
          <div>
            <p className="font-semibold text-[var(--text)]">{author.fullName}</p>
            <p className="text-sm text-[var(--text-muted)]">
              @{author.username} · {formatRelative(idea.createdAt)}
            </p>
          </div>
        </Link>
      ) : null}

      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown>{idea.description}</ReactMarkdown>
      </div>

      {idea.media?.length ? <MediaViewer media={idea.media} /> : null}

      {idea.collaborators?.length ? (
        <div>
          <h3 className="mb-2 font-semibold text-[var(--text)]">Collaborators</h3>
          <ul className="flex flex-wrap gap-2">
            {idea.collaborators.map((c) => {
              const u = resolveAuthor(c.userId);
              return (
                <li key={String(u?._id ?? c.userId)}>
                  <Badge variant="muted">
                    @{u?.username ?? 'user'} · {c.role}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {user && idea.collaboratorsOpen && author?._id !== user._id ? (
        <div className="rounded-xl border border-[var(--border)] p-4">
          {!collabOpen ? (
            <Button type="button" onClick={() => setCollabOpen(true)}>
              Request to collaborate
            </Button>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void collab
                  .mutateAsync({
                    message: collabMsg,
                    skillsOffered: collabSkills,
                  })
                  .then(() => {
                    setCollabOpen(false);
                    setCollabMsg('');
                    setCollabSkills([]);
                  });
              }}
            >
              <textarea
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
                rows={3}
                value={collabMsg}
                onChange={(e) => setCollabMsg(e.target.value)}
                placeholder="Why do you want to collaborate?"
                required
              />
              <div className="flex flex-wrap gap-2">
                {collabSkills.map((s) => (
                  <Badge key={s} variant="default">
                    {s}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() =>
                        setCollabSkills((x) => x.filter((y) => y !== s))
                      }
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add skill + Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const t = skillInput.trim();
                    if (t && !collabSkills.includes(t)) {
                      setCollabSkills((x) => [...x, t]);
                      setSkillInput('');
                    }
                  }
                }}
              />
              <div className="flex gap-2">
                <Button type="submit" loading={collab.isPending}>
                  Send request
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCollabOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--text)]">
          <MessageCircle className="h-5 w-5" />
          Comments ({idea.commentCount})
        </h3>
        {user ? (
          <form
            className="mb-6 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!topComment.trim()) return;
              void addTop.mutateAsync({ content: topComment }).then(() => {
                setTopComment('');
              });
            }}
          >
            <Input
              value={topComment}
              onChange={(e) => setTopComment(e.target.value)}
              placeholder="Add a comment…"
            />
            <Button type="submit" loading={addTop.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : null}
        {commentsLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <CommentTree
            comments={flatComments}
            onReply={handleReply}
            replyPending={addTop.isPending}
          />
        )}
      </section>
    </div>
  );
}
