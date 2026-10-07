'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { ideasApi } from '@/lib/api/ideas.api';
import { ICONS } from '@/lib/icons';
import type { IUser } from '@/types/api';

export function LikesModal({
  ideaId,
  open,
  onClose,
}: {
  ideaId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await ideasApi.getLikes(ideaId);
        const raw = res.data;
        const list = Array.isArray(raw)
          ? (raw as IUser[])
          : raw &&
              typeof raw === 'object' &&
              'users' in raw &&
              Array.isArray((raw as { users: IUser[] }).users)
            ? (raw as { users: IUser[] }).users
            : [];
        if (!cancelled) setUsers(list);
      } catch {
        if (!cancelled) {
          setUsers([]);
          toast.error('Could not load likes');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ideaId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[70vh] w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl dark:border-slate-700/50 dark:bg-[#18191a]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 dark:border-slate-700/50">
          <span className="font-bold">Likes</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-surface2"
            aria-label="Close"
          >
            <ICONS.clear />
          </button>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {loading ? (
            <li className="p-4 text-center text-sm text-[var(--text-muted)]">
              Loading…
            </li>
          ) : !users.length ? (
            <li className="p-4 text-center text-sm text-[var(--text-muted)]">
              No likes to show.
            </li>
          ) : (
            users.map((u) => (
              <li key={u._id}>
                <Link
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface2 dark:hover:bg-[#242526]"
                  onClick={onClose}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-full bg-surface2">
                    {u.avatarUrl ? (
                      <Image
                        src={u.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.fullName}</p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      @{u.username}
                    </p>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
