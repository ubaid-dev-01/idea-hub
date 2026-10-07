'use client';

import { ICONS } from '@/lib/icons';
import { useAuthStore } from '@/store/authStore';
import { useUiStore, type CreateIdeaMediaFocus } from '@/store/uiStore';

const shortcuts: Array<{
  key: CreateIdeaMediaFocus;
  label: string;
  icon: typeof ICONS.video;
  className: string;
}> = [
  { key: 'video', label: 'Video idea', icon: ICONS.video, className: 'text-red-500' },
  { key: 'image', label: 'Photo/Image', icon: ICONS.image, className: 'text-emerald-500' },
  {
    key: 'document',
    label: 'Document',
    icon: ICONS.pdf,
    className: 'text-blue-500',
  },
  { key: 'tag', label: 'Tag People', icon: ICONS.tag, className: 'text-amber-500' },
];

export function CreateIdeaBox() {
  const user = useAuthStore((s) => s.user);
  const openCreate = useUiStore((s) => s.openCreateIdea);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm dark:border-slate-700/50 dark:bg-[#18191a]">
      <div className="flex gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-surface2 bg-cover bg-center ring-2 ring-brand/10 dark:bg-[#242526]"
          style={
            user?.avatarUrl
              ? { backgroundImage: `url(${user.avatarUrl})` }
              : undefined
          }
        />
        <button
          type="button"
          onClick={() => openCreate('none')}
          className="flex-1 rounded-full bg-surface2 px-4 py-2.5 text-left text-sm text-[var(--text-muted)] transition hover:bg-slate-200/80 dark:bg-[#242526] dark:hover:bg-[#2d2f31]"
        >
          Share your idea…
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-4 dark:border-slate-700/50">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => openCreate(s.key)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium text-[var(--text)] transition hover:bg-surface2 dark:hover:bg-[#242526]"
            >
              <Icon className={s.className} size={20} strokeWidth={1.5} />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
