'use client';

import Link from 'next/link';
import { onValue, ref } from 'firebase/database';
import { useEffect, useMemo, useState } from 'react';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { ICONS } from '@/lib/icons';
import {
  hasFirebaseClientConfig,
  missingFirebaseClientConfigKeys,
  tryGetFirebaseDb,
} from '@/lib/firebase.client';
import { ensureFirebaseAuth } from '@/lib/firebase-auth';
import type { ChatThreadRow } from '@/lib/chat';
import { useAuthStore } from '@/store/authStore';

export default function MessagesPage() {
  return (
    <AuthGuard>
      <MessagesContent />
    </AuthGuard>
  );
}

function MessagesContent() {
  const me = useAuthStore((s) => s.user);
  const [rows, setRows] = useState<ChatThreadRow[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!me) return;
    const db = tryGetFirebaseDb();
    if (!db) return;
    let unsub: (() => void) | undefined;
    void ensureFirebaseAuth(me._id).then(() => {
      const r = ref(db, `userChats/${me._id}`);
      unsub = onValue(r, (snap) => {
        const v = (snap.val() ?? {}) as Record<string, ChatThreadRow>;
        const list = Object.values(v)
          .filter(Boolean)
          .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
        setRows(list);
      });
    });
    return () => unsub?.();
  }, [me?._id]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const label =
        r.kind === 'group' ? r.groupName ?? r.peerFullName : r.peerUsername;
      return (
        label?.toLowerCase().includes(t) ||
        r.peerFullName?.toLowerCase().includes(t)
      );
    });
  }, [q, rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--text)]">Messages</h1>
        <Button type="button" variant="secondary" asChild>
          <Link href="/messages/new-group">New group</Link>
        </Button>
      </div>

      {!hasFirebaseClientConfig() ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)] dark:border-slate-700/50 dark:bg-[#18191a]">
          Firebase config missing in the running dev build.
          <div className="mt-2 text-xs">
            Missing:
            <ul className="mt-1 list-inside list-disc">
              {missingFirebaseClientConfigKeys().map((k) => (
                <li key={k}>
                  <code>{k}</code>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-2 text-xs">
            Fix: ensure keys exist in <code>web.ideahub.com/.env.local</code>{' '}
            then <b>stop</b> and <b>restart</b> <code>npm run dev</code>. If it
            still happens, delete <code>.next</code> and restart.
          </p>
        </div>
      ) : null}

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search username or name…"
      />

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center dark:border-slate-700/50">
          <p className="text-sm text-[var(--text-muted)]">
            No conversations yet.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Open a profile and tap Message, or create a group.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] dark:divide-slate-700/50 dark:border-slate-700/50 dark:bg-[#18191a]">
          {filtered.map((r) => (
            <li key={r.chatId}>
              <Link
                href={
                  r.kind === 'group'
                    ? `/messages/g/${encodeURIComponent(r.chatId)}`
                    : `/messages/${encodeURIComponent(r.peerUsername)}`
                }
                className="flex items-center gap-3 px-4 py-3 hover:bg-surface2 dark:hover:bg-[#242526]"
              >
                {r.kind === 'group' ? (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2 dark:bg-[#242526]">
                    <ICONS.collaborations size={22} strokeWidth={1.5} />
                  </span>
                ) : (
                  <Avatar
                    src={r.peerAvatarUrl}
                    fallback={r.peerFullName ?? r.peerUsername ?? '?'}
                    size="md"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text)]">
                    {r.kind === 'group'
                      ? r.groupName ?? r.peerFullName
                      : r.peerFullName || r.peerUsername}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {r.lastText || '—'}
                  </p>
                </div>
                {r.unreadCount > 0 ? (
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white'
                    )}
                  >
                    {r.unreadCount > 99 ? '99+' : r.unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

