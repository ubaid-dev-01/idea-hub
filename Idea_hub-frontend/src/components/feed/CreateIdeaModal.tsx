'use client';

import { Globe, Lock, Users } from 'lucide-react';
import Image from 'next/image';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';

import { useCreateIdea } from '@/hooks/useIdeas';
import { useUpload } from '@/hooks/useUpload';
import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';
import { useAuthStore } from '@/store/authStore';
import type { CreateIdeaMediaFocus } from '@/store/uiStore';
import type {
  CreateIdeaPayload,
  IdeaCategory,
  IdeaVisibility,
  MediaType,
} from '@/types/api';

const CATEGORIES: IdeaCategory[] = [
  'tech',
  'health',
  'education',
  'environment',
  'finance',
  'social',
  'art',
  'other',
];

const VIS_OPTIONS: Array<{
  value: IdeaVisibility;
  label: string;
  Icon: typeof Globe;
}> = [
  { value: 'public', label: 'Public', Icon: Globe },
  { value: 'collaborators_only', label: 'Collaborators', Icon: Users },
  { value: 'private', label: 'Private', Icon: Lock },
];

function mediaTypeForFile(f: File): MediaType | null {
  if (f.type.startsWith('image/')) return 'image';
  if (f.type.startsWith('video/')) return 'video';
  if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    return 'pdf';
  if (
    f.type.includes('word') ||
    f.type.includes('document') ||
    f.name.toLowerCase().match(/\.(doc|docx|txt)$/)
  )
    return 'doc';
  return null;
}

type LocalFile = {
  id: string;
  file: File;
  kind: MediaType;
  previewUrl?: string;
};

export function CreateIdeaModal({
  open,
  onClose,
  initialMediaFocus,
}: {
  open: boolean;
  onClose: () => void;
  initialMediaFocus: CreateIdeaMediaFocus;
}) {
  const uid = useId();
  const user = useAuthStore((s) => s.user);
  const createMut = useCreateIdea();
  const { uploadFile } = useUpload();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<IdeaVisibility>('public');
  const [category, setCategory] = useState<IdeaCategory>('tech');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState('');
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [locationText, setLocationText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [visOpen, setVisOpen] = useState(false);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setTitle('');
    setDescription('');
    setVisibility('public');
    setCategory('tech');
    setTags([]);
    setTagInput('');
    setCollaboratorsOpen(false);
    setRequiredSkills('');
    setFiles((prev) => {
      for (const f of prev) {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      }
      return [];
    });
    setLinkUrl('');
    setLocationText('');
    setShowEmoji(false);
    setVisOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    const t = requestAnimationFrame(() => {
      if (initialMediaFocus === 'image') imgRef.current?.click();
      else if (initialMediaFocus === 'video') vidRef.current?.click();
      else if (initialMediaFocus === 'document') docRef.current?.click();
      else if (initialMediaFocus === 'tag') {
        taRef.current?.focus();
        toast('Tag collaborators in your description with @username');
      }
    });
    return () => cancelAnimationFrame(t);
  }, [open, initialMediaFocus, reset]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(120, el.scrollHeight)}px`;
  }, [description, open]);

  const onPickFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const next: LocalFile[] = [];
    for (const file of Array.from(list)) {
      const mt = mediaTypeForFile(file);
      if (!mt) {
        toast.error(`Unsupported file: ${file.name}`);
        continue;
      }
      const previewUrl =
        mt === 'image' || mt === 'video'
          ? URL.createObjectURL(file)
          : undefined;
      next.push({
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        kind: mt,
        previewUrl,
      });
    }
    setFiles((f) => [...f, ...next]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const x = prev.find((p) => p.id === id);
      if (x?.previewUrl) URL.revokeObjectURL(x.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags((x) => [...x, t]);
    setTagInput('');
  };

  const insertEmoji = (e: string) => {
    const el = taRef.current;
    if (!el) {
      setDescription((d) => d + e);
      return;
    }
    const start = el.selectionStart ?? description.length;
    const end = el.selectionEnd ?? description.length;
    const next =
      description.slice(0, start) + e + description.slice(end);
    setDescription(next);
    setShowEmoji(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + e.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onSubmit = async () => {
    if (!title.trim()) {
      toast.error('Add a title for your idea');
      return;
    }
    const body = description.trim();

    const media: CreateIdeaPayload['media'] = [];

    try {
      for (const item of files) {
        const url = await uploadFile(item.file);
        const mt = item.kind;
        media.push({
          cdnUrl: url,
          mimeType: item.file.type || 'application/octet-stream',
          mediaType: mt,
          thumbnailUrl:
            mt === 'image' || mt === 'video' ? url : undefined,
          fileSizeBytes: item.file.size,
        });
      }

      if (linkUrl.trim()) {
        const u = linkUrl.trim();
        try {
          // eslint-disable-next-line no-new
          new URL(u);
          media.push({
            cdnUrl: u,
            mimeType: 'text/plain',
            mediaType: 'link',
            fileSizeBytes: 0,
          });
        } catch {
          toast.error('Invalid link URL');
          return;
        }
      }

      const payload: CreateIdeaPayload = {
        title: title.trim(),
        description: body || ' ',
        category,
        tags,
        visibility,
        collaboratorsOpen,
        requiredSkills: collaboratorsOpen
          ? requiredSkills
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        media,
        ...(locationText.trim()
          ? { location: locationText.trim().slice(0, 200) }
          : {}),
      };

      await createMut.mutateAsync(payload);
      for (const f of files) {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      }
      onClose();
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not post';
      toast.error(msg);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby={`${uid}-title`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close backdrop"
        onClick={onClose}
      />
      <div className="relative flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl dark:border-slate-700/50 dark:bg-[#18191a] sm:max-h-[90vh] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3 dark:border-slate-700/50">
          <span id={`${uid}-title`} className="flex-1 text-center text-lg font-bold">
            Create Idea
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] hover:bg-surface2 dark:hover:bg-[#242526]"
            aria-label="Close"
          >
            <ICONS.clear size={22} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="flex gap-3">
            <div
              className="h-10 w-10 shrink-0 rounded-full bg-surface2 bg-cover bg-center"
              style={
                user?.avatarUrl
                  ? { backgroundImage: `url(${user.avatarUrl})` }
                  : undefined
              }
            />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[var(--text)]">{user?.fullName}</p>
              <p className="text-sm text-[var(--text-muted)]">
                @{user?.username}
              </p>
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setVisOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-surface2 px-3 py-1.5 text-sm dark:bg-[#242526]"
                >
                  {(() => {
                    const sel = VIS_OPTIONS.find((v) => v.value === visibility);
                    const SelIcon = sel?.Icon ?? Globe;
                    return (
                      <>
                        <SelIcon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                        <span>{sel?.label}</span>
                      </>
                    );
                  })()}
                </button>
                {visOpen ? (
                  <ul className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl dark:bg-[#242526]">
                    {VIS_OPTIONS.map((v) => (
                      <li key={v.value}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface2 dark:hover:bg-[#3a3b3c]"
                          onClick={() => {
                            setVisibility(v.value);
                            setVisOpen(false);
                          }}
                        >
                          <v.Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} />
                          {v.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          <input
            className="mt-4 w-full border-b border-transparent bg-transparent text-lg font-semibold text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-brand/30"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            ref={taRef}
            className="mt-2 w-full min-h-[120px] resize-none border-0 bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
            placeholder="Describe your idea in detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {linkUrl ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface2 px-3 py-2 text-xs dark:bg-[#242526]">
              <ICONS.link size={16} />
              <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                {linkUrl}
              </span>
              <button
                type="button"
                className="shrink-0 rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => setLinkUrl('')}
                aria-label="Remove link"
              >
                <ICONS.clear size={16} />
              </button>
            </div>
          ) : null}

          {files.length ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="relative aspect-video overflow-hidden rounded-xl bg-surface2 dark:bg-[#242526]"
                >
                  {f.kind === 'image' && f.previewUrl ? (
                    <Image
                      src={f.previewUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : f.kind === 'video' && f.previewUrl ? (
                    <video
                      src={f.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-2 text-center text-xs text-[var(--text-muted)]">
                      {f.file.name}
                    </div>
                  )}
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    onClick={() => removeFile(f.id)}
                    aria-label="Remove"
                  >
                    <ICONS.clear size={16} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Category
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize',
                    category === c
                      ? 'bg-brand text-white'
                      : 'bg-surface2 text-[var(--text)] dark:bg-[#242526]'
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
              Tags
            </p>
            <div className="mt-2 flex min-h-[40px] flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-surface2/50 px-2 py-2 dark:bg-[#242526]/50">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand dark:text-indigo-300"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => setTags((x) => x.filter((y) => y !== t))}
                    aria-label={`Remove ${t}`}
                  >
                    <ICONS.clear size={14} />
                  </button>
                </span>
              ))}
              {tags.length < 10 ? (
                <input
                  className="min-w-[120px] flex-1 border-0 bg-transparent text-sm outline-none"
                  placeholder="+ Add tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                />
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ICONS.collaborations size={20} />
              Open for collaborators
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={collaboratorsOpen}
              onClick={() => setCollaboratorsOpen((x) => !x)}
              className={cn(
                'relative h-7 w-12 rounded-full transition',
                collaboratorsOpen ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
                  collaboratorsOpen ? 'left-6' : 'left-0.5'
                )}
              />
            </button>
          </div>
          {collaboratorsOpen ? (
            <input
              className="mt-2 w-full rounded-xl border border-[var(--border)] bg-surface2 px-3 py-2 text-sm dark:bg-[#242526]"
              placeholder="What skills do you need? (comma-separated)"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
            />
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[var(--border)] px-3 py-2 dark:border-slate-700/50">
          <div className="flex flex-wrap items-center gap-1">
            <input
              ref={imgRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={vidRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={docRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <IconBarButton
              label="Image"
              onClick={() => imgRef.current?.click()}
              icon={<ICONS.image />}
            />
            <IconBarButton
              label="Video"
              onClick={() => vidRef.current?.click()}
              icon={<ICONS.video />}
            />
            <IconBarButton
              label="Document"
              onClick={() => docRef.current?.click()}
              icon={<ICONS.pdf />}
            />
            <IconBarButton
              label="Link"
              onClick={() => {
                const u = window.prompt('Paste URL');
                if (u) setLinkUrl(u);
              }}
              icon={<ICONS.link />}
            />
            <IconBarButton
              label="Location"
              onClick={() => {
                const loc = window.prompt('Add location');
                if (loc) setLocationText(loc);
              }}
              icon={<ICONS.mapPin />}
            />
            <div className="relative">
              <IconBarButton
                label="Emoji"
                onClick={() => setShowEmoji((s) => !s)}
                icon={<ICONS.smile />}
              />
              {showEmoji ? (
                <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl">
                  {['😀', '❤️', '💡', '🚀', '👏', '🤔', '🔥', '✨'].map(
                    (em) => (
                      <button
                        key={em}
                        type="button"
                        className="text-xl hover:scale-110"
                        onClick={() => insertEmoji(em)}
                      >
                        {em}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end border-t border-[var(--border)] px-4 py-3 dark:border-slate-700/50">
          <button
            type="button"
            disabled={!title.trim() || createMut.isPending}
            onClick={() => void onSubmit()}
            className="rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white shadow disabled:opacity-50 dark:hover:bg-indigo-500"
          >
            {createMut.isPending ? 'Posting…' : 'Post Idea'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function IconBarButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface2 dark:hover:bg-[#242526]"
    >
      {icon}
    </button>
  );
}
