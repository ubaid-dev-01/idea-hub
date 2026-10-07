'use client';

import {
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/components/ui/cn';
import { useToggleLike, useToggleSave } from '@/hooks/useIdeas';
import { resolveAuthor } from '@/lib/author';
import { formatRelative } from '@/lib/utils';
import type { IIdea } from '@/types/api';

const categoryTone: Record<
  string,
  'brand' | 'accent' | 'warning' | 'default' | 'muted'
> = {
  tech: 'brand',
  health: 'accent',
  education: 'brand',
  environment: 'accent',
  finance: 'warning',
  social: 'default',
  art: 'brand',
  other: 'muted',
};

function firstVisualMedia(idea: IIdea) {
  const m = idea.media?.[0];
  if (!m) return null;
  if (m.mediaType === 'image' || m.mediaType === 'video') {
    const src = m.thumbnailUrl || m.cdnUrl || m.firebaseUrl;
    return { type: m.mediaType as 'image' | 'video', src };
  }
  if (m.mediaType === 'pdf') return { type: 'pdf' as const, src: '' };
  return null;
}

export function IdeaCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}

export function IdeaCard({
  idea,
  currentUserId,
}: {
  idea: IIdea;
  currentUserId?: string;
}) {
  const [savedLocal, setSavedLocal] = useState(false);
  const likeMut = useToggleLike(idea._id);
  const saveMut = useToggleSave(idea._id);
  const author = resolveAuthor(idea.authorId);
  const vis = firstVisualMedia(idea);
  const cat = String(idea.category);
  const badgeVariant = categoryTone[cat] ?? 'default';

  const scanBadge =
    idea.status === 'published' ? null : idea.status === 'ai_scanning' ? (
      <Badge variant="warning">Reviewing…</Badge>
    ) : idea.status === 'pending_review' ? (
      <Badge variant="warning">Under review</Badge>
    ) : idea.status === 'rejected' ? (
      <Badge variant="danger">Not approved</Badge>
    ) : null;

  const onLike = () => {
    void likeMut.mutateAsync().catch(() => undefined);
  };

  const onSave = () => {
    const next = !savedLocal;
    setSavedLocal(next);
    void saveMut
      .mutateAsync({ saved: savedLocal })
      .catch(() => setSavedLocal(!next));
  };

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-all duration-200 hover:shadow-md dark:border-cyan-500/12 dark:bg-[#0b111b]/90 dark:shadow-[0_0_24px_rgba(0,242,255,0.04)] dark:hover:border-cyan-500/25 dark:hover:shadow-[0_0_36px_rgba(0,242,255,0.08)]">
      <Link href={`/ideas/${idea._id}`} className="relative block aspect-video bg-surface2">
        {vis?.type === 'image' && vis.src ? (
          <Image
            src={vis.src}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            unoptimized={vis.src.includes('localhost')}
          />
        ) : vis?.type === 'video' && vis.src ? (
          <Image
            src={vis.src}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
            {vis?.type === 'pdf' ? 'PDF' : 'No preview'}
          </div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={badgeVariant}>{cat}</Badge>
          {scanBadge}
          {idea.collaboratorsOpen ? (
            <Badge variant="accent" className="gap-1">
              <Users className="h-3 w-3" />
              Seeking collaborators
            </Badge>
          ) : null}
        </div>
        <Link href={`/ideas/${idea._id}`}>
          <h3 className="line-clamp-2 text-lg font-semibold text-[var(--text)] group-hover:text-brand">
            {idea.title}
          </h3>
        </Link>
        <div className="flex flex-wrap gap-1">
          {idea.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded-md bg-surface2 px-2 py-0.5 text-xs text-[var(--text-muted)]"
            >
              #{t}
            </span>
          ))}
          {idea.tags.length > 3 ? (
            <span className="text-xs text-[var(--text-muted)]">
              +{idea.tags.length - 3}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <div className="h-8 w-8 overflow-hidden rounded-full bg-surface2">
            {author?.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-cover"
                unoptimized
              />
            ) : null}
          </div>
          <div>
            {author ? (
              <Link
                href={`/profile/${author.username}`}
                className="font-medium text-[var(--text)] hover:underline"
              >
                @{author.username}
              </Link>
            ) : (
              <span>Author</span>
            )}
            <p className="text-xs">{formatRelative(idea.createdAt)}</p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {idea.viewCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {idea.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              {idea.commentCount}
            </span>
          </div>
          {currentUserId ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={(e) => {
                  e.preventDefault();
                  onLike();
                }}
                aria-label="Like"
              >
                <Heart
                  className={cn(
                    'h-5 w-5',
                    likeMut.isPending && 'opacity-50'
                  )}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={(e) => {
                  e.preventDefault();
                  onSave();
                }}
                aria-label="Save"
              >
                <Bookmark
                  className={cn(
                    'h-5 w-5',
                    savedLocal && 'fill-current text-brand'
                  )}
                />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
