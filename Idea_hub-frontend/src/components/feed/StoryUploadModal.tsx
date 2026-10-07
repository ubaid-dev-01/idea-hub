'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useCreateStory } from '@/hooks/useStories';
import { useUpload } from '@/hooks/useUpload';
import { ICONS } from '@/lib/icons';

export function StoryUploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const { uploadFile, reset } = useUpload();
  const createMut = useCreateStory();

  if (!open) return null;

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setCaption('');
    reset();
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    if (busy) return;
    clear();
    onClose();
  };

  const onPick = (f: File | null) => {
    if (!f) return;
    const isVideo = f.type.startsWith('video/');
    const isImage = f.type.startsWith('image/');
    if (!isVideo && !isImage) {
      toast.error('Choose an image or video');
      return;
    }
    if (f.size > 40 * 1024 * 1024) {
      toast.error('File must be under 40MB');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) {
      toast.error('Pick a photo or video first');
      return;
    }
    setBusy(true);
    try {
      const mediaUrl = await uploadFile(file);
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      await createMut.mutateAsync({
        mediaUrl,
        thumbnailUrl: mediaUrl,
        mediaType,
        caption: caption.trim(),
      });
      clear();
      onClose();
    } catch {
      /* toast from hooks / upload */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={handleClose}
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl sm:rounded-2xl dark:border-slate-700/50 dark:bg-[#18191a]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-base font-semibold text-[var(--text)]">
            New story
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-surface2"
            aria-label="Close"
          >
            <ICONS.clear size={18} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4">
          <p className="text-xs text-[var(--text-muted)]">
            Stories are separate from ideas. They auto-remove after 24 hours.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />

          {preview && file ? (
            <div className="relative overflow-hidden rounded-xl bg-black">
              {file.type.startsWith('video/') ? (
                <video
                  src={preview}
                  className="max-h-72 w-full object-contain"
                  controls
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Story preview"
                  className="max-h-72 w-full object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => clear()}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] text-white"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-surface2 px-4 py-10 text-sm text-[var(--text-muted)] transition hover:border-[var(--lh-accent)] hover:text-[var(--lh-accent)]"
            >
              <ICONS.post size={28} />
              Tap to upload photo or video
            </button>
          )}

          <textarea
            className="w-full rounded-xl border border-[var(--border)] bg-surface2 p-3 text-sm dark:bg-[#242526]"
            rows={2}
            maxLength={200}
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-full border border-[var(--border)] py-2.5 text-sm font-medium text-[var(--text-muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !file || createMut.isPending}
            onClick={() => void submit()}
            className="flex-1 rounded-full bg-[var(--lh-ink)] py-2.5 text-sm font-semibold text-[var(--lh-bg)] disabled:opacity-50"
          >
            {busy || createMut.isPending ? 'Posting…' : 'Share story'}
          </button>
        </div>
      </div>
    </div>
  );
}
