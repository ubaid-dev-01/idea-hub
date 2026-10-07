'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useReducer, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { onValue, ref } from 'firebase/database';
import { z } from 'zod';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MediaPreviewModal } from '@/components/ui/MediaPreviewModal';
import { cn } from '@/components/ui/cn';
import { useCreateIdea, useIdea, useIdeaScanPoll } from '@/hooks/useIdeas';
import { useUpload } from '@/hooks/useUpload';
import { getFirebaseDb } from '@/lib/firebase.client';
import type {
  CreateIdeaPayload,
  IdeaCategory,
  IdeaVisibility,
  IMedia,
  MediaType,
} from '@/types/api';
import { useAuthStore } from '@/store/authStore';

const categories: IdeaCategory[] = [
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
];

const step1Schema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(10000),
  category: z.enum([
    'tech',
    'health',
    'education',
    'environment',
    'finance',
    'social',
    'art',
    'other',
  ]),
  tags: z.array(z.string()).max(10),
});

type WizardState = {
  step: number;
  ideaId: string | null;
  collaboratorsOpen: boolean;
  requiredSkills: string[];
  visibility: IdeaVisibility;
  skillInput: string;
  tagInput: string;
  scanSnapshot: Record<string, unknown> | null;
};

type WizardAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' }
  | { type: 'setIdeaId'; id: string }
  | { type: 'setScan'; data: Record<string, unknown> | null }
  | { type: 'toggleCollab' }
  | { type: 'setVisibility'; v: IdeaVisibility }
  | { type: 'addSkill'; s: string }
  | { type: 'removeSkill'; s: string }
  | { type: 'setSkillInput'; v: string }
  | { type: 'setTagInput'; v: string }
  | { type: 'goto'; step: number };

function wizardReducer(s: WizardState, a: WizardAction): WizardState {
  switch (a.type) {
    case 'next':
      return { ...s, step: Math.min(4, s.step + 1) };
    case 'back':
      return { ...s, step: Math.max(0, s.step - 1) };
    case 'reset':
      return {
        step: 0,
        ideaId: null,
        collaboratorsOpen: false,
        requiredSkills: [],
        visibility: 'public',
        skillInput: '',
        tagInput: '',
        scanSnapshot: null,
      };
    case 'setIdeaId':
      return { ...s, ideaId: a.id };
    case 'setScan':
      return { ...s, scanSnapshot: a.data };
    case 'toggleCollab':
      return { ...s, collaboratorsOpen: !s.collaboratorsOpen };
    case 'setVisibility':
      return { ...s, visibility: a.v };
    case 'addSkill':
      return s.requiredSkills.includes(a.s)
        ? s
        : { ...s, requiredSkills: [...s.requiredSkills, a.s] };
    case 'removeSkill':
      return {
        ...s,
        requiredSkills: s.requiredSkills.filter((x) => x !== a.s),
      };
    case 'setSkillInput':
      return { ...s, skillInput: a.v };
    case 'setTagInput':
      return { ...s, tagInput: a.v };
    case 'goto':
      return { ...s, step: a.step };
    default:
      return s;
  }
}

function guessMediaType(file: File): MediaType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') return 'pdf';
  if (
    file.type.includes('word') ||
    file.name.endsWith('.doc') ||
    file.name.endsWith('.docx')
  )
    return 'doc';
  return 'link';
}

export function UploadWizard() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const duetParentId = (searchParams.get('duet') ?? '').trim();
  const isDuetMode =
    duetParentId.length === 24 && /^[a-f\d]{24}$/i.test(duetParentId);
  const duetParentQ = useIdea(isDuetMode ? duetParentId : '');

  const [state, dispatch] = useReducer(wizardReducer, {
    step: 0,
    ideaId: null,
    collaboratorsOpen: false,
    requiredSkills: [],
    visibility: 'public',
    skillInput: '',
    tagInput: '',
    scanSnapshot: null,
  });
  const [previewMd, setPreviewMd] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<IMedia | null>(null);
  const { uploads, uploadFile, reset: resetUploads } = useUpload();
  const createIdea = useCreateIdea();
  const [trackedFiles, setTrackedFiles] = useState<
    { file: File; id: string }[]
  >([]);

  const form = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      title: '',
      description: '',
      category: 'tech' as IdeaCategory,
      tags: [] as string[],
    },
  });

  useEffect(() => {
    if (isDuetMode) {
      dispatch({ type: 'setVisibility', v: 'public' });
    }
  }, [isDuetMode]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!user) return;
      for (const file of accepted) {
        const id = `${file.name}-${file.size}-${Date.now()}`;
        setTrackedFiles((prev) => [...prev, { file, id }]);
        const folder = `ideas/draft/${user._id}`;
        try {
          await uploadFile(file, folder);
        } catch {
          /* toast via mutation */
        }
      }
    },
    [uploadFile, user]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'video/*': [],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
      ],
    },
    maxSize: 500 * 1024 * 1024,
  });

  const scanPoll = useIdeaScanPoll(
    state.ideaId,
    state.step === 3 && Boolean(state.ideaId)
  );

  useEffect(() => {
    if (state.step !== 3 || !state.ideaId) return;
    let db: ReturnType<typeof getFirebaseDb>;
    try {
      db = getFirebaseDb();
    } catch {
      return;
    }
    const r = ref(db, `scan_updates/${state.ideaId}`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val() as Record<string, unknown> | null;
      if (v && typeof v === 'object') {
        dispatch({ type: 'setScan', data: v });
      }
    });
    return () => unsub();
  }, [state.step, state.ideaId]);

  /** When RTDB never updates (no Admin/worker), finish from API poll. */
  useEffect(() => {
    if (state.step !== 3 || !scanPoll.data) return;
    const idea = scanPoll.data;
    if (
      idea.status !== 'published' &&
      idea.status !== 'pending_review' &&
      idea.status !== 'rejected'
    ) {
      return;
    }
    const snap = state.scanSnapshot;
    if (
      snap &&
      snap.status === idea.status &&
      Number(snap.progress) === 100
    ) {
      return;
    }
    const score =
      typeof idea.contentScanScore === 'number' ? idea.contentScanScore : 1;
    const violations =
      idea.rejectionReason != null && idea.rejectionReason !== ''
        ? [idea.rejectionReason]
        : [];
    dispatch({
      type: 'setScan',
      data: {
        status: idea.status,
        progress: 100,
        score,
        violations,
      },
    });
  }, [state.step, state.scanSnapshot, scanPoll.data]);

  const removeTracked = (id: string) => {
    setTrackedFiles((prev) => prev.filter((x) => x.id !== id));
  };

  const submitCreate = async () => {
    const v = form.getValues();
    const doneUrls = uploads.filter((u) => u.status === 'done' && u.url);
    const media = trackedFiles
      .map((t) => {
        const up = uploads.find(
          (u) => u.file.name === t.file.name && u.file.size === t.file.size
        );
        if (!up?.url) return null;
        return {
          firebaseUrl: up.url,
          mimeType: t.file.type || 'application/octet-stream',
          mediaType: guessMediaType(t.file),
          thumbnailUrl: '',
          fileSizeBytes: t.file.size,
        };
      })
      .filter(Boolean) as CreateIdeaPayload['media'];

    const payload: CreateIdeaPayload = {
      title: v.title,
      description: v.description,
      category: v.category,
      tags: v.tags,
      visibility: isDuetMode ? 'public' : state.visibility,
      collaboratorsOpen: state.collaboratorsOpen,
      requiredSkills: state.requiredSkills,
      media,
      ...(isDuetMode
        ? { parentIdeaId: duetParentId, isDuetResponse: true }
        : {}),
    };

    const idea = await createIdea.mutateAsync(payload);
    dispatch({ type: 'setIdeaId', id: idea._id });
    if (
      idea.status === 'published' ||
      idea.status === 'pending_review' ||
      idea.status === 'rejected'
    ) {
      const score =
        typeof idea.contentScanScore === 'number' ? idea.contentScanScore : 1;
      const violations =
        idea.rejectionReason != null && idea.rejectionReason !== ''
          ? [idea.rejectionReason]
          : [];
      dispatch({
        type: 'setScan',
        data: {
          status: idea.status,
          progress: 100,
          score,
          violations,
        },
      });
    } else {
      dispatch({ type: 'setScan', data: null });
    }
    dispatch({ type: 'goto', step: 3 });
  };

  const steps = ['Basics', 'Media', 'Collaboration', 'Scan', 'Done'];

  const scanScore =
    typeof state.scanSnapshot?.score === 'number'
      ? (state.scanSnapshot.score as number)
      : null;
  const scanStatus = state.scanSnapshot?.status as string | undefined;
  const violations = (state.scanSnapshot?.violations as string[]) ?? [];

  return (
    <div className="w-full space-y-6 px-4 pb-8 md:space-y-8 md:px-0 md:pb-0">
      <div className="flex justify-center gap-2">
        {steps.map((label, i) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <span
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                i < state.step
                  ? 'border-brand bg-brand text-white'
                  : i === state.step
                    ? 'border-brand text-brand'
                    : 'border-[var(--border)] text-[var(--text-muted)]'
              )}
            >
              {i < state.step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className="hidden sm:block">{label}</span>
          </div>
        ))}
      </div>

      {state.step === 0 ? (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(() => dispatch({ type: 'next' }))}
        >
          {isDuetMode ? (
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm dark:border-indigo-500/40 dark:bg-indigo-500/10">
              <p className="font-bold text-[var(--text)]">Idea duet</p>
              <p className="mt-1 text-[var(--text-muted)]">
                Building on{' '}
                {duetParentQ.data ? (
                  <>
                    <Link
                      href={`/ideas/${duetParentId}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {duetParentQ.data.title}
                    </Link>
                    {duetParentQ.data.authorId &&
                    typeof duetParentQ.data.authorId === 'object' &&
                    'username' in duetParentQ.data.authorId ? (
                      <>
                        {' '}
                        by @
                        {(duetParentQ.data.authorId as { username: string }).username}
                      </>
                    ) : null}
                  </>
                ) : (
                  'the original idea'
                )}
                . Your post will be public.
              </p>
            </div>
          ) : null}
          <div>
            <label className="text-sm font-medium text-[var(--text)]">
              Title
            </label>
            <Input {...form.register('title')} className="mt-1" />
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {form.watch('title').length}/200
            </p>
            {form.formState.errors.title ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-[var(--text)]">
                Description
              </label>
              <button
                type="button"
                className="text-xs text-brand"
                onClick={() => setPreviewMd((p) => !p)}
              >
                {previewMd ? 'Edit' : 'Preview'}
              </button>
            </div>
            {previewMd ? (
              <div className="min-h-[160px] rounded-lg border border-[var(--border)] bg-surface2 p-3 text-sm whitespace-pre-wrap">
                {form.watch('description')}
              </div>
            ) : (
              <textarea
                {...form.register('description')}
                rows={8}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
              />
            )}
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {form.watch('description').length}/10000 · Markdown supported
            </p>
            {form.formState.errors.description ? (
              <p className="text-sm text-red-600">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)]">
              Category
            </label>
            <select
              {...form.register('category')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--text)]">
              Tags
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {form.watch('tags').map((t) => (
                <Badge key={t} variant="default">
                  {t}
                  <button
                    type="button"
                    className="ml-1"
                    onClick={() =>
                      form.setValue(
                        'tags',
                        form.getValues('tags').filter((x) => x !== t)
                      )
                    }
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              className="mt-2"
              placeholder="Type tag + Enter"
              value={state.tagInput}
              onChange={(e) =>
                dispatch({ type: 'setTagInput', v: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const t = state.tagInput.trim().toLowerCase();
                  if (!t) return;
                  const cur = form.getValues('tags');
                  if (cur.length >= 10 || cur.includes(t)) return;
                  form.setValue('tags', [...cur, t]);
                  dispatch({ type: 'setTagInput', v: '' });
                }
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit">Next</Button>
          </div>
        </form>
      ) : null}

      {state.step === 1 ? (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={cn(
              'cursor-pointer rounded-xl border-2 border-dashed border-[var(--border)] p-8 text-center transition-colors',
              isDragActive && 'border-brand bg-brand/5'
            )}
          >
            <input {...getInputProps()} />
            <p className="text-sm text-[var(--text)]">
              Drag files here or click — images, video, PDF, Word, Excel (max
              500MB video)
            </p>
          </div>
          <ul className="space-y-3">
            {trackedFiles.map((t) => {
              const up = uploads.find(
                (u) =>
                  u.file.name === t.file.name && u.file.size === t.file.size
              );
              const canOpen = up?.status === 'done' && Boolean(up.url);
              return (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t.file.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {(t.file.size / 1024).toFixed(1)} KB
                    </p>
                    {up?.status === 'uploading' ? (
                      <div className="mt-2 h-2 w-full overflow-hidden rounded bg-surface2">
                        <div
                          className="h-full bg-brand transition-all"
                          style={{ width: `${up.progress}%` }}
                        />
                      </div>
                    ) : null}
                    {up?.status === 'error' ? (
                      <p className="text-xs text-red-600">{up.error}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {canOpen ? (
                      <button
                        type="button"
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] transition hover:bg-surface2"
                        onClick={() => {
                          const kind = guessMediaType(t.file);
                          setPreviewMedia({
                            _id: `preview:${t.id}`,
                            mediaType: kind,
                            firebaseUrl: up!.url!,
                            cdnUrl: up!.url!,
                            publicId: up!.publicId ?? '',
                            thumbnailUrl: up!.thumbnailUrl ?? up!.url!,
                            mimeType: t.file.type || 'application/octet-stream',
                            scanStatus: 'pending',
                            scanViolations: [],
                            fileSizeBytes: t.file.size,
                          });
                        }}
                      >
                        Open
                      </button>
                    ) : null}
                    {up?.status === 'pending' || !up ? (
                      <button
                        type="button"
                        onClick={() => removeTracked(t.id)}
                        className="text-[var(--text-muted)]"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <MediaPreviewModal
            isOpen={Boolean(previewMedia)}
            onClose={() => setPreviewMedia(null)}
            media={previewMedia}
            title="Upload preview"
          />
          <div className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dispatch({ type: 'back' })}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button type="button" onClick={() => dispatch({ type: 'next' })}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {state.step === 2 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
            <div>
              <p className="font-medium text-[var(--text)]">
                Open for collaborators
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                Others can request to join your idea.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.collaboratorsOpen}
              onClick={() => dispatch({ type: 'toggleCollab' })}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors',
                state.collaboratorsOpen ? 'bg-brand' : 'bg-surface2'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                  state.collaboratorsOpen ? 'left-6' : 'left-0.5'
                )}
              />
            </button>
          </div>
          {state.collaboratorsOpen ? (
            <div>
              <label className="text-sm font-medium">Required skills</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.requiredSkills.map((s) => (
                  <Badge key={s}>
                    {s}
                    <button
                      type="button"
                      className="ml-1"
                      onClick={() => dispatch({ type: 'removeSkill', s })}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                className="mt-2"
                value={state.skillInput}
                onChange={(e) =>
                  dispatch({ type: 'setSkillInput', v: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const s = state.skillInput.trim();
                    if (s) {
                      dispatch({ type: 'addSkill', s });
                      dispatch({ type: 'setSkillInput', v: '' });
                    }
                  }
                }}
                placeholder="Skill + Enter"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text)]">
              Visibility
            </p>
            {(
              [
                {
                  v: 'public' as const,
                  label: 'Public',
                  d: 'Visible to everyone',
                },
                {
                  v: 'private' as const,
                  label: 'Private',
                  d: 'Only you',
                },
                {
                  v: 'collaborators_only' as const,
                  label: 'Collaborators only',
                  d: 'You and accepted collaborators',
                },
              ] as const
            ).map((opt) => (
              <label
                key={opt.v}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-lg border p-3',
                  state.visibility === opt.v
                    ? 'border-brand bg-brand/5'
                    : 'border-[var(--border)]'
                )}
              >
                <input
                  type="radio"
                  name="vis"
                  checked={state.visibility === opt.v}
                  onChange={() => dispatch({ type: 'setVisibility', v: opt.v })}
                />
                <div>
                  <p className="font-medium">{opt.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{opt.d}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => dispatch({ type: 'back' })}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              type="button"
              loading={createIdea.isPending}
              onClick={() => void submitCreate().catch(() => undefined)}
            >
              Submit & scan
            </Button>
          </div>
        </div>
      ) : null}

      {state.step === 3 ? (
        <div className="space-y-6 text-center">
          <h3 className="text-lg font-semibold text-[var(--text)]">
            AI content scan
          </h3>
          {(() => {
            const snap = state.scanSnapshot;
            const hasSnap = Boolean(
              snap && typeof snap === 'object' && Object.keys(snap).length > 0
            );
            const apiStatus = scanPoll.data?.status;
            const waitingInQueue =
              !hasSnap && apiStatus === 'ai_scanning';

            if (waitingInQueue) {
              return (
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 rounded-lg border border-[var(--border)] px-4 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-brand" />
                  <p className="text-sm text-[var(--text-muted)]">
                    Scan is running on the server. This page will update when it
                    finishes — usually under a minute. If it never completes,
                    start the API scan worker and Redis, or check Firebase
                    Realtime Database rules for{' '}
                    <code className="text-xs">scan_updates</code>.
                  </p>
                </div>
              );
            }

            return (
          <div className="mx-auto flex max-w-sm flex-col gap-3">
            {[
              'Uploading',
              'Scanning text',
              'Scanning media',
              'Calculating score',
            ].map((label, i) => {
              const progress = Number(state.scanSnapshot?.progress ?? 0);
              const active =
                progress >= (i + 1) * 25 || (i === 3 && progress === 100);
              return (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                  )}
                >
                  {active ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {label}
                </div>
              );
            })}
          </div>
            );
          })()}
          <div className="h-3 w-full overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full bg-brand transition-all"
              style={{
                width: `${Math.min(100, Number(state.scanSnapshot?.progress ?? 10))}%`,
              }}
            />
          </div>
          {scanScore !== null ? (
            <div>
              <p
                className={cn(
                  'text-2xl font-bold',
                  scanScore >= 0.85
                    ? 'text-emerald-600'
                    : scanScore >= 0.5
                      ? 'text-amber-600'
                      : 'text-red-600'
                )}
              >
                Score: {(scanScore * 100).toFixed(0)}%
              </p>
              {scanScore >= 0.85 ? (
                <p className="text-emerald-700">Approved — publishing…</p>
              ) : scanScore >= 0.5 ? (
                <p className="text-amber-700">Under human review</p>
              ) : (
                <div className="text-left">
                  <p className="text-red-700">Not approved</p>
                  <ul className="mt-2 list-inside list-disc text-sm">
                    {violations.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={() => {
                      dispatch({ type: 'reset' });
                      form.reset();
                      resetUploads();
                      setTrackedFiles([]);
                    }}
                  >
                    Edit and resubmit
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          {scanStatus === 'published' ||
          scanStatus === 'pending_review' ||
          scanStatus === 'rejected' ? (
            <Button type="button" onClick={() => dispatch({ type: 'next' })}>
              Continue
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.step === 4 && state.ideaId ? (
        <div className="space-y-6 text-center">
          <Check className="mx-auto h-14 w-14 text-accent" />
          <h3 className="text-xl font-semibold">You&apos;re all set</h3>
          <div className="rounded-xl border border-[var(--border)] p-4 text-left">
            <p className="font-medium">{form.getValues('title')}</p>
            <p className="text-sm text-[var(--text-muted)]">
              {form.getValues('category')} · {form.getValues('tags').join(', ')}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/ideas/${state.ideaId}`}>
              <Button>View idea</Button>
            </Link>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                dispatch({ type: 'reset' });
                form.reset();
                resetUploads();
                setTrackedFiles([]);
              }}
            >
              Post another
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
