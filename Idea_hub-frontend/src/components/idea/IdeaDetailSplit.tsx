'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { MediaViewer } from '@/components/idea/MediaViewer';
import {
  ValidationScoreCard,
  validationEngineEnabled,
} from '@/components/idea/ValidationScoreCard';
import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import {
  useAddComment,
  useIdea,
  useIdeaComments,
  useRecordIdeaView,
  useToggleLike,
  useToggleSave,
} from '@/hooks/useIdeas';
import { ideasApi } from '@/lib/api/ideas.api';
import { coachApi } from '@/lib/api/coach.api';
import { isAiCoachUiEnabled } from '@/lib/ai-coach-ui';
import { resolveAuthor } from '@/lib/author';
import { formatRelative } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import type { IdeaPollOptionKey, IIdea } from '@/types/api';

const POLL_OPTIONS: Array<{ key: IdeaPollOptionKey; label: string }> = [
  { key: 'yes_definitely', label: 'Yes definitely' },
  { key: 'maybe', label: 'Maybe' },
  { key: 'not_for_me', label: 'Not for me' },
  { key: 'already_exists', label: 'Already exists' },
];

function IdeaCoachPanel({ idea }: { idea: IIdea }) {
  const qc = useQueryClient();
  const refreshMut = useMutation({
    mutationFn: () => coachApi.refreshIdeaFeedback(idea._id),
    onSuccess: (updated) => {
      void qc.setQueryData(['idea', idea._id], updated);
      toast.success('Coach feedback updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fb = idea.aiCoachFeedback;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--text)]">AI coach feedback</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={refreshMut.isPending}
          onClick={() => refreshMut.mutate()}
        >
          Refresh analysis
        </Button>
      </div>
      {!fb ? (
        <p className="text-sm text-[var(--text-muted)]">
          Analysis will appear shortly after you publish (or tap Refresh).
        </p>
      ) : (
        <>
          <p className="text-sm text-[var(--text)]">{fb.overallFeedback}</p>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
              Strengths
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-[var(--text)]">
              {fb.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--text-muted)]">
              Improvements
            </p>
            <ul className="mt-2 space-y-3">
              {fb.improvements.map((im, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-[var(--border)] p-3 dark:border-slate-700/50"
                >
                  <p className="text-sm font-medium text-[var(--text)]">
                    {im.issue}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{im.fix}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    variant="secondary"
                    onClick={() =>
                      toast.success(`Try this: ${im.fix}`, { duration: 5000 })
                    }
                  >
                    Do this (+{im.xpReward} XP)
                  </Button>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text)]">Market:</span>{' '}
            {fb.marketInsight}
          </p>
          <div className="rounded-xl bg-brand/5 p-3 dark:bg-indigo-500/10">
            <p className="text-xs font-bold uppercase text-brand">Next step</p>
            <p className="mt-1 text-sm text-[var(--text)]">{fb.nextStep}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function IdeaDetailSplit({
  idea,
  onClose,
  variant = 'page',
}: {
  idea: IIdea;
  onClose?: () => void;
  variant?: 'page' | 'modal';
}) {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const author = resolveAuthor(idea.authorId);
  const [ideaTab, setIdeaTab] = useState<
    'details' | 'changelog' | 'poll' | 'coach'
  >('details');
  const [diffFrom, setDiffFrom] = useState<number | ''>('');
  const [diffTo, setDiffTo] = useState<number | ''>('');
  const [pollQuestionDraft, setPollQuestionDraft] = useState(
    idea.poll?.question ?? ''
  );

  useEffect(() => {
    setPollQuestionDraft(idea.poll?.question ?? '');
  }, [idea._id, idea.poll?.question]);

  const viewMut = useRecordIdeaView(idea._id, 'feed');
  useEffect(() => {
    void viewMut.mutateAsync().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea._id]);

  const likeMut = useToggleLike(idea._id);
  const saveMut = useToggleSave(idea._id);
  const commentsQ = useIdeaComments(idea._id);
  const addComment = useAddComment(idea._id);
  const [text, setText] = useState('');

  const liked = idea.liked ?? false;
  const saved = idea.saved ?? false;

  const isAuthor =
    Boolean(user && author && String(author._id) === String(user._id));
  const showCoachTab = isAiCoachUiEnabled() && isAuthor;
  const showPollTab = Boolean(idea.poll?.enabled) || isAuthor;
  const duetParentId =
    idea.isDuetResponse && idea.parentIdeaId ? idea.parentIdeaId : '';
  const parentIdeaQ = useIdea(duetParentId);

  const versionsQ = useQuery({
    queryKey: ['idea', idea._id, 'versions'],
    queryFn: () => ideasApi.getIdeaVersions(idea._id),
    enabled: idea.status === 'published',
    staleTime: 60_000,
    retry: 1,
  });

  const diffQ = useQuery({
    queryKey: ['idea', idea._id, 'diff', diffFrom, diffTo],
    queryFn: () =>
      ideasApi.getIdeaVersionDiff(
        idea._id,
        Number(diffFrom),
        Number(diffTo)
      ),
    enabled:
      idea.status === 'published' &&
      typeof diffFrom === 'number' &&
      typeof diffTo === 'number' &&
      diffFrom > 0 &&
      diffTo > 0,
  });

  const votePollMut = useMutation({
    mutationFn: (key: IdeaPollOptionKey) =>
      ideasApi.voteIdeaPoll(idea._id, key),
    onSuccess: (updated) => {
      void qc.setQueryData(['idea', idea._id], updated);
      toast.success('Vote saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchPollMut = useMutation({
    mutationFn: (body: { enabled?: boolean; question?: string }) =>
      ideasApi.patchIdeaPoll(idea._id, body),
    onSuccess: (updated) => {
      void qc.setQueryData(['idea', idea._id], updated);
      toast.success('Poll updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pages = commentsQ.data?.pages ?? [];
  const comments = [...pages.flatMap((p) => p.comments)].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const inner = (
    <div
      className={cn(
        'flex max-h-[100dvh] flex-col overflow-hidden bg-[var(--surface)] shadow-2xl dark:bg-[#18191a]',
        variant === 'modal'
          ? 'max-h-[min(92vh,900px)] w-full max-w-[min(100vw-1rem,1280px)] md:flex-row md:rounded-xl'
          : 'min-h-[calc(100vh-4rem)] w-full max-w-6xl md:flex-row md:rounded-xl md:border md:border-[var(--border)]'
      )}
    >
      <div
        className={cn(
          'relative flex min-h-[40vh] flex-1 items-center justify-center bg-black md:min-h-0 md:w-[52%] lg:w-[50%]',
          variant === 'modal' && 'md:min-h-[min(55vh,520px)]',
          variant === 'page' && 'md:w-[55%] xl:w-[48%]'
        )}
      >
        {onClose ? (
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white md:hidden"
            onClick={onClose}
            aria-label="Close"
          >
            <ICONS.clear className="text-white" />
          </button>
        ) : null}
        {idea.media?.length ? (
          <div className="h-full w-full overflow-auto p-2">
            <MediaViewer media={idea.media} />
          </div>
        ) : (
          <p className="text-sm text-white/60">No media</p>
        )}
      </div>

      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col border-t border-[var(--border)] md:border-l md:border-t-0 dark:border-slate-700/50',
          variant === 'page' ? 'md:w-[45%] xl:w-[52%] xl:flex-row' : 'w-full md:w-[48%] lg:w-[50%]'
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap gap-1 border-b border-[var(--border)] px-2 pt-2 dark:border-slate-700/50">
          <button
            type="button"
            onClick={() => setIdeaTab('details')}
            className={cn(
              'rounded-t-lg px-3 py-2 text-xs font-bold',
              ideaTab === 'details'
                ? 'bg-[var(--surface)] text-brand dark:bg-[#242526]'
                : 'text-[var(--text-muted)]'
            )}
          >
            Details
          </button>
          {idea.status === 'published' ? (
            <button
              type="button"
              onClick={() => setIdeaTab('changelog')}
              className={cn(
                'rounded-t-lg px-3 py-2 text-xs font-bold',
                ideaTab === 'changelog'
                  ? 'bg-[var(--surface)] text-brand dark:bg-[#242526]'
                  : 'text-[var(--text-muted)]'
              )}
            >
              Changelog
            </button>
          ) : null}
          {showPollTab ? (
            <button
              type="button"
              onClick={() => setIdeaTab('poll')}
              className={cn(
                'rounded-t-lg px-3 py-2 text-xs font-bold',
                ideaTab === 'poll'
                  ? 'bg-[var(--surface)] text-brand dark:bg-[#242526]'
                  : 'text-[var(--text-muted)]'
              )}
            >
              Poll
            </button>
          ) : null}
          {showCoachTab ? (
            <button
              type="button"
              onClick={() => setIdeaTab('coach')}
              className={cn(
                'rounded-t-lg px-3 py-2 text-xs font-bold',
                ideaTab === 'coach'
                  ? 'bg-[var(--surface)] text-brand dark:bg-[#242526]'
                  : 'text-[var(--text-muted)]'
              )}
            >
              AI coach
            </button>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] p-4 dark:border-slate-700/50">
          <div className="flex min-w-0 flex-1 gap-3">
            <Link
              href={author ? `/profile/${author.username}` : '#'}
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface2"
            >
              {author?.avatarUrl ? (
                <Image
                  src={author.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </Link>
            <div className="min-w-0">
              <Link
                href={author ? `/profile/${author.username}` : '#'}
                className="font-bold text-[var(--text)] hover:underline"
              >
                {author?.fullName}
              </Link>
              <p className="text-xs text-[var(--text-muted)]">
                @{author?.username} · {formatRelative(idea.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {author && user && author._id !== user._id ? (
              <button
                type="button"
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
              >
                Follow
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                className="hidden rounded-full p-2 hover:bg-surface2 md:block dark:hover:bg-[#242526]"
                onClick={onClose}
                aria-label="Close"
              >
                <ICONS.clear />
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full p-2 hover:bg-surface2 dark:hover:bg-[#242526]"
              aria-label="More"
            >
              <ICONS.more />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {ideaTab === 'coach' && showCoachTab ? (
            <IdeaCoachPanel idea={idea} />
          ) : ideaTab === 'changelog' ? (
            <div className="space-y-4 text-sm">
              <p className="text-[var(--color-text-muted)]">
                Version history. Pick two versions below to compare title, description,
                category, and tags.
              </p>
              {versionsQ.isLoading ? (
                <p className="text-[var(--color-text-muted)]">Loading versions…</p>
              ) : versionsQ.isError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-red-700 dark:text-red-300">
                  <p className="text-sm">Could not load version history.</p>
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-brand underline"
                    onClick={() => void versionsQ.refetch()}
                  >
                    Retry
                  </button>
                </div>
              ) : (versionsQ.data ?? []).length === 0 ? (
                <p className="rounded-xl border border-[var(--color-border)] p-4 text-[var(--color-text-muted)] dark:border-slate-700/50">
                  No saved versions yet. After you edit a published idea, new versions
                  appear here.
                </p>
              ) : (
                <ul className="space-y-2 rounded-xl border border-[var(--color-border)] p-3 dark:border-slate-700/50">
                  {(versionsQ.data ?? []).map((v) => (
                    <li
                      key={v.versionNumber}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
                    >
                      <span className="font-bold text-brand">v{v.versionNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-[var(--color-text-primary)]">
                        {v.title}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        {formatRelative(v.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-bold text-[var(--text-muted)]">
                  From v
                  <select
                    className="ml-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)]"
                    value={diffFrom === '' ? '' : String(diffFrom)}
                    onChange={(e) =>
                      setDiffFrom(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                  >
                    <option value="">—</option>
                    {(versionsQ.data ?? []).map((v) => (
                      <option key={`f-${v.versionNumber}`} value={v.versionNumber}>
                        {v.versionNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-[var(--text-muted)]">
                  To v
                  <select
                    className="ml-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)]"
                    value={diffTo === '' ? '' : String(diffTo)}
                    onChange={(e) =>
                      setDiffTo(e.target.value ? Number(e.target.value) : '')
                    }
                  >
                    <option value="">—</option>
                    {(versionsQ.data ?? []).map((v) => (
                      <option key={`t-${v.versionNumber}`} value={v.versionNumber}>
                        {v.versionNumber}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {diffQ.data ? (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-3 dark:border-slate-700/50">
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">
                    Changes v{diffQ.data.fromVersion} → v{diffQ.data.toVersion}
                  </p>
                  {diffQ.data.changes.length === 0 ? (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      No differences in title, description, category, or tags between
                      these versions.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2 text-xs text-[var(--color-text-primary)]">
                      {diffQ.data.changes.map((ch, i) => (
                        <li key={i}>
                          <span className="font-semibold uppercase text-brand">
                            {ch.field}
                          </span>
                          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/5 p-2 dark:bg-white/5">
                            {JSON.stringify(
                              { before: ch.before, after: ch.after },
                              null,
                              2
                            )}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : diffFrom && diffTo ? (
                <p className="text-xs text-[var(--color-text-muted)]">Loading diff…</p>
              ) : null}
            </div>
          ) : ideaTab === 'poll' ? (
            <div className="space-y-4">
              {isAuthor ? (
                <div className="space-y-2 rounded-xl border border-[var(--color-border)] p-3 dark:border-slate-700/50">
                  <p className="text-xs font-bold text-[var(--color-text-primary)]">
                    Author controls
                  </p>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <input
                      type="checkbox"
                      checked={Boolean(idea.poll?.enabled)}
                      onChange={(e) =>
                        void patchPollMut.mutateAsync({
                          enabled: e.target.checked,
                        })
                      }
                    />
                    Enable poll on this idea
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                      value={pollQuestionDraft}
                      onChange={(e) => setPollQuestionDraft(e.target.value)}
                      placeholder="Optional question"
                    />
                    <Button
                      type="button"
                      size="sm"
                      loading={patchPollMut.isPending}
                      onClick={() =>
                        void patchPollMut.mutateAsync({
                          question: pollQuestionDraft,
                        })
                      }
                    >
                      Save question
                    </Button>
                  </div>
                </div>
              ) : null}
              {!idea.poll?.enabled ? (
                <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100/90">
                  {isAuthor
                    ? 'Turn on “Enable poll” above so others can vote.'
                    : 'Voting is off until the author enables the poll.'}
                </div>
              ) : null}
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {idea.poll?.question?.trim()
                  ? idea.poll.question
                  : 'Would you use this?'}
              </p>
              {idea.poll?.enabled && !user ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  <Link href="/login" className="font-semibold text-brand hover:underline">
                    Sign in
                  </Link>{' '}
                  to vote.
                </p>
              ) : null}
              {(() => {
                const pc = {
                  yes_definitely: idea.poll?.counts?.yes_definitely ?? 0,
                  maybe: idea.poll?.counts?.maybe ?? 0,
                  not_for_me: idea.poll?.counts?.not_for_me ?? 0,
                  already_exists: idea.poll?.counts?.already_exists ?? 0,
                };
                const total = POLL_OPTIONS.reduce((s, o) => s + pc[o.key], 0);
                const pollActive = Boolean(idea.poll?.enabled);
                return POLL_OPTIONS.map((o) => {
                  const n = pc[o.key];
                  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                  return (
                    <div
                      key={o.key}
                      className={cn('space-y-1', !pollActive && 'opacity-50')}
                    >
                      <div className="flex justify-between text-xs font-medium text-[var(--color-text-primary)]">
                        <span>{o.label}</span>
                        <span>
                          {n} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border-light)] dark:bg-[#242526]">
                        <div
                          className="h-full rounded-full bg-brand transition-all duration-500 ease-out dark:bg-indigo-500"
                          style={{ width: `${pollActive ? pct : 0}%` }}
                        />
                      </div>
                      {user && pollActive ? (
                        <button
                          type="button"
                          className={cn(
                            'text-xs font-semibold',
                            idea.poll?.myVote === o.key
                              ? 'text-brand'
                              : 'text-[var(--color-text-muted)] hover:text-brand'
                          )}
                          onClick={() => void votePollMut.mutateAsync(o.key)}
                        >
                          {idea.poll?.myVote === o.key ? 'Your vote' : 'Vote'}
                        </button>
                      ) : null}
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <>
              {duetParentId && parentIdeaQ.data ? (
                <div className="rounded-xl border border-brand/30 bg-brand/5 p-3 text-sm dark:border-indigo-500/40">
                  <p className="text-xs font-bold uppercase text-brand">
                    Duet
                  </p>
                  <p className="mt-1 text-[var(--text)]">
                    Building on{' '}
                    <Link
                      href={`/ideas/${duetParentId}`}
                      className="font-semibold hover:underline"
                    >
                      {parentIdeaQ.data.title}
                    </Link>
                    {(() => {
                      const pa = resolveAuthor(parentIdeaQ.data.authorId);
                      return pa ? (
                        <>
                          {' '}
                          by{' '}
                          <Link
                            href={`/profile/${pa.username}`}
                            className="font-semibold hover:underline"
                          >
                            @{pa.username}
                          </Link>
                        </>
                      ) : null;
                    })()}
                  </p>
                </div>
              ) : null}
              {validationEngineEnabled() ? (
                <div
                  className={cn(
                    variant === 'page' ? 'xl:hidden' : '',
                    'shrink-0'
                  )}
                >
                  <ValidationScoreCard idea={idea} />
                </div>
              ) : null}
              <article className="space-y-3 border-b border-[var(--color-border)] pb-4 dark:border-slate-700/40">
                <div className="flex flex-wrap items-center gap-2">
                  {typeof idea.version === 'number' ? (
                    <span className="rounded-full bg-[var(--color-border-light)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)] dark:bg-gray-800">
                      v{idea.version}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-brand dark:bg-indigo-500/15">
                    {idea.category}
                  </span>
                </div>
                <h1 className="text-balance text-xl font-bold leading-snug tracking-tight text-[var(--color-text-primary)] sm:text-2xl">
                  {idea.title}
                </h1>
                <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-[var(--color-text-primary)] sm:text-base">
                  {idea.description}
                </p>
                {idea.location?.trim() ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    📍 {idea.location}
                  </p>
                ) : null}
                {idea.aiSummary?.trim() ? (
                  <p className="rounded-xl border border-[var(--border)] bg-surface2/50 p-3 text-sm text-[var(--text-muted)] dark:border-slate-700/50">
                    <span className="font-semibold text-[var(--text)]">Summary: </span>
                    {idea.aiSummary}
                  </p>
                ) : null}
                {idea.aiSuggestedTags && idea.aiSuggestedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {idea.aiSuggestedTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md border border-dashed border-brand/40 px-2 py-0.5 text-xs text-brand"
                      >
                        +{t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {idea.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {idea.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-[var(--color-border-light)] px-2 py-0.5 text-xs font-medium text-brand dark:bg-gray-800/80"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>

              <div className="flex flex-wrap gap-4 border-y border-[var(--border)] py-3 dark:border-slate-700/50">
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-semibold"
                  onClick={() =>
                    void likeMut.mutateAsync().catch(() => undefined)
                  }
                >
                  <ICONS.like
                    className={liked ? 'fill-red-500 text-red-500' : ''}
                    fill={liked ? 'currentColor' : 'none'}
                  />
                  {idea.likeCount}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1 text-sm font-semibold"
                  onClick={() =>
                    void saveMut.mutateAsync({ saved }).catch(() => undefined)
                  }
                >
                  <ICONS.bookmark
                    fill={saved ? 'currentColor' : 'none'}
                    className={saved ? 'text-brand' : ''}
                  />
                </button>
                {user && author && user._id !== author._id ? (
                  <Link
                    href={`/ideas/new?duet=${idea._id}`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Respond (duet)
                  </Link>
                ) : null}
              </div>

              <div>
                <p className="mb-2 text-sm font-bold">Comments</p>
                <ul className="space-y-3">
                  {comments.map((c) => {
                    const a = resolveAuthor(c.authorId);
                    return (
                      <li key={c._id} className="flex gap-2 text-sm">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface2">
                          {a?.avatarUrl ? (
                            <Image
                              src={a.avatarUrl}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : null}
                        </div>
                        <div>
                          <span className="font-bold">{a?.fullName}</span>{' '}
                          <span className="text-[var(--text)]">{c.content}</span>
                          <p className="text-xs text-[var(--text-muted)]">
                            {formatRelative(c.createdAt)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {commentsQ.hasNextPage ? (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-brand"
                    onClick={() => void commentsQ.fetchNextPage()}
                  >
                    Load more
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>

        {user && ideaTab === 'details' ? (
          <form
            className="shrink-0 border-t border-[var(--border)] p-3 dark:border-slate-700/50"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              void addComment.mutateAsync({ content: text.trim() }).then(() => {
                setText('');
              });
            }}
          >
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-surface2 px-4 py-2 text-sm dark:bg-[#242526]"
                placeholder="Add a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                type="submit"
                disabled={addComment.isPending}
                className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </form>
        ) : null}
        </div>

        {validationEngineEnabled() && variant === 'page' ? (
          <aside className="hidden shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] p-4 dark:border-gray-700 xl:flex xl:w-[280px] xl:flex-col xl:border-l xl:border-t-0">
            <div className="xl:sticky xl:top-4 xl:self-start">
              <ValidationScoreCard idea={idea} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 sm:p-4 md:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-black/70"
          aria-label="Close"
          onClick={onClose}
        />
        <div className="relative z-10 flex max-h-[100dvh] w-full max-w-[1280px] justify-center px-1 sm:px-0">
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full justify-center py-4">{inner}</div>
  );
}
