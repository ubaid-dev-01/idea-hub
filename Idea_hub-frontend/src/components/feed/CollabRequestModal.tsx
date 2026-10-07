'use client';

import { useState } from 'react';

import { useCollabRequest } from '@/hooks/useIdeas';
import { ICONS } from '@/lib/icons';

export function CollabRequestModal({
  ideaId,
  open,
  onClose,
}: {
  ideaId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [skills, setSkills] = useState('');
  const mut = useCollabRequest(ideaId);

  if (!open) return null;

  const submit = async () => {
    await mut.mutateAsync({
      message: message.trim() || 'I would love to collaborate.',
      skillsOffered: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    onClose();
    setMessage('');
    setSkills('');
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl dark:border-slate-700/50 dark:bg-[#18191a]">
        <div className="flex items-center gap-2 text-lg font-bold">
          <ICONS.collaborate className="text-accent" />
          Request to collaborate
        </div>
        <textarea
          className="mt-4 w-full rounded-xl border border-[var(--border)] bg-surface2 p-3 text-sm dark:bg-[#242526]"
          rows={3}
          placeholder="Introduce yourself…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <input
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-surface2 p-3 text-sm dark:bg-[#242526]"
          placeholder="Skills you offer (comma-separated)"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-surface2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={mut.isPending}
            onClick={() => void submit().catch(() => undefined)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {mut.isPending ? 'Sending…' : 'Send request'}
          </button>
        </div>
      </div>
    </div>
  );
}
