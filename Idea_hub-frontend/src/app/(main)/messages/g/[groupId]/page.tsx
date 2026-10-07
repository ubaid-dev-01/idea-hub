'use client';

import { onValue, ref } from 'firebase/database';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import {
  markChatRead,
  sendGroupMessage,
  type ChatMessage,
  type GroupChatMeta,
  type GroupMemberPreview,
} from '@/lib/chat';
import { ensureFirebaseAuth } from '@/lib/firebase-auth';
import {
  hasFirebaseClientConfig,
  missingFirebaseClientConfigKeys,
  tryGetFirebaseDb,
} from '@/lib/firebase.client';
import { ICONS } from '@/lib/icons';
import { pushWithViewTransition } from '@/lib/viewTransitions';
import { useAuthStore } from '@/store/authStore';

function buildMemberLookup(
  meta: GroupChatMeta,
  messages: ChatMessage[],
  me: { _id: string; username: string; fullName: string; avatarUrl?: string } | null
): Map<string, GroupMemberPreview> {
  const map = new Map<string, GroupMemberPreview>();
  for (const p of meta.members ?? []) {
    const id = String(p.userId);
    map.set(id, {
      userId: id,
      username: p.username,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl ?? '',
    });
  }
  for (const msg of messages) {
    const id = String(msg.fromUserId);
    const cur = map.get(id);
    map.set(id, {
      userId: id,
      username: msg.fromUsername ?? cur?.username ?? '',
      fullName: msg.fromDisplayName ?? cur?.fullName ?? 'Member',
      avatarUrl: msg.fromAvatarUrl ?? cur?.avatarUrl ?? '',
    });
  }
  if (me) {
    const mid = String(me._id);
    const cur = map.get(mid);
    map.set(mid, {
      userId: mid,
      username: me.username,
      fullName: me.fullName,
      avatarUrl: me.avatarUrl ?? cur?.avatarUrl ?? '',
    });
  }
  for (const rawId of meta.memberIds) {
    const id = String(rawId);
    if (!map.has(id)) {
      map.set(id, {
        userId: id,
        username: '',
        fullName: 'Member',
        avatarUrl: '',
      });
    }
  }
  return map;
}

export default function GroupChatPage() {
  return (
    <AuthGuard>
      <GroupChatContent />
    </AuthGuard>
  );
}

function GroupChatContent() {
  const router = useRouter();
  const params = useParams();
  const groupId = String(params.groupId ?? '');
  const me = useAuthStore((s) => s.user);

  const [meta, setMeta] = useState<GroupChatMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [membersOpen, setMembersOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const memberById = useMemo(() => {
    if (!meta || meta.type !== 'group') return new Map<string, GroupMemberPreview>();
    return buildMemberLookup(meta, messages, me);
  }, [meta, messages, me]);

  const membersSorted = useMemo(() => {
    if (!meta?.memberIds?.length) return [];
    const arr: GroupMemberPreview[] = meta.memberIds.map((id) => {
      const sid = String(id);
      return (
        memberById.get(sid) ?? {
          userId: sid,
          username: '',
          fullName: 'Member',
          avatarUrl: '',
        }
      );
    });
    return [...arr].sort((a, b) =>
      (a.fullName || a.username).localeCompare(b.fullName || b.username, undefined, {
        sensitivity: 'base',
      })
    );
  }, [meta?.memberIds, memberById]);

  useEffect(() => {
    if (!groupId || !me) return;
    const db = tryGetFirebaseDb();
    if (!db) {
      setMetaLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    void ensureFirebaseAuth(me._id)
      .then(() => {
        const r = ref(db, `chats/${groupId}/meta`);
        unsub = onValue(r, (snap) => {
          setMetaLoading(false);
          setMeta(snap.exists() ? (snap.val() as GroupChatMeta) : null);
        });
      })
      .catch(() => setMetaLoading(false));
    return () => unsub?.();
  }, [groupId, me?._id]);

  const allowed = useMemo(() => {
    if (!me || !meta?.memberIds?.length) return false;
    const ids = meta.memberIds.map((id) => String(id));
    return ids.includes(String(me._id));
  }, [me?._id, meta]);

  useEffect(() => {
    if (!me || !groupId || !allowed) return;
    const db = tryGetFirebaseDb();
    if (!db) return;
    let unsub: (() => void) | undefined;
    void ensureFirebaseAuth(me._id).then(() => {
      const r = ref(db, `chats/${groupId}/messages`);
      unsub = onValue(r, (snap) => {
        const v = (snap.val() ?? {}) as Record<string, ChatMessage>;
        const list = Object.values(v)
          .filter(Boolean)
          .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
        setMessages(list);
        void markChatRead(db, me._id, groupId);
      });
    });
    return () => unsub?.();
  }, [allowed, groupId, me?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const onSend = async () => {
    if (!me || !meta?.memberIds?.length) return;
    const db = tryGetFirebaseDb();
    if (!db) {
      toast.error('Chat is not configured (missing Firebase env).');
      return;
    }
    try {
      await ensureFirebaseAuth(me._id);
      await sendGroupMessage(
        db,
        groupId,
        me,
        meta.memberIds.map((id) => String(id)),
        text
      );
      setText('');
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const msg =
        err?.code === 'PERMISSION_DENIED' ||
        /PERMISSION_DENIED/i.test(String(err?.message ?? e))
          ? 'Permission denied — publish Idea_hub-backend/database.rules.json in Firebase RTDB, and enable Authentication.'
          : err?.message && typeof err.message === 'string'
            ? err.message
            : 'Could not send message';
      console.error('[group chat] send failed', e);
      toast.error(msg);
    }
  };

  if (metaLoading) {
    return <p className="text-sm text-[var(--text-muted)]">Loading…</p>;
  }

  if (!meta || meta.type !== 'group') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">Group not found.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => pushWithViewTransition(router, '/messages')}
        >
          Back to inbox
        </Button>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">You are not in this group.</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => pushWithViewTransition(router, '/messages')}
        >
          Back to inbox
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] dark:border-slate-700/50 dark:bg-[#18191a]">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 dark:border-slate-700/50">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--text-muted)] hover:bg-surface2 dark:hover:bg-[#242526]"
          onClick={() => pushWithViewTransition(router, '/messages')}
        >
          Back
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl text-left transition hover:bg-surface2/80 dark:hover:bg-[#242526]/80"
          onClick={() => setMembersOpen(true)}
          aria-label="View group members"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface2 dark:bg-[#242526]">
            <ICONS.collaborations size={20} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--text)]">
              {meta.name}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {meta.memberIds.length} members · tap for details
            </p>
          </div>
        </button>
      </header>

      <Modal
        isOpen={membersOpen}
        onClose={() => setMembersOpen(false)}
        title="People in this chat"
        size="md"
      >
        <ul className="divide-y divide-[var(--border)] dark:divide-slate-700/50">
          {membersSorted.map((p) => (
            <li
              key={p.userId}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Avatar
                src={p.avatarUrl || undefined}
                fallback={p.fullName || p.username || '?'}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--text)]">
                  {p.fullName || p.username || 'Member'}
                </p>
                {p.username ? (
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    @{p.username}
                  </p>
                ) : (
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    Profile unavailable
                  </p>
                )}
              </div>
              {p.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(p.username)}`}
                  className="shrink-0 text-sm font-semibold text-brand dark:text-indigo-400"
                  onClick={() => setMembersOpen(false)}
                >
                  Profile
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </Modal>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {!hasFirebaseClientConfig() ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)] dark:border-slate-700/50 dark:bg-[#18191a]">
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
        {messages.length ? (
          messages.map((m, i) => {
            const mine = String(m.fromUserId) === String(me?._id);
            const prev = i > 0 ? messages[i - 1] : null;
            const sameSenderAsPrev =
              prev && String(prev.fromUserId) === String(m.fromUserId);
            const sender = memberById.get(String(m.fromUserId));
            const label =
              sender?.fullName ||
              m.fromDisplayName ||
              sender?.username ||
              m.fromUsername ||
              'Member';
            const avatarSrc =
              mine ?
                me?.avatarUrl
              : sender?.avatarUrl || m.fromAvatarUrl || undefined;

            if (mine) {
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex gap-2',
                    sameSenderAsPrev ? 'mt-0.5' : 'mt-2',
                    'justify-end'
                  )}
                >
                  <div className="flex max-w-[min(85%,20rem)] flex-col items-end gap-0.5">
                    <div className="rounded-2xl bg-brand px-3 py-2 text-sm leading-snug text-white">
                      {m.text}
                    </div>
                  </div>
                  <div className="w-8 shrink-0 pt-4">
                    {!sameSenderAsPrev ? (
                      <Avatar
                        src={avatarSrc}
                        fallback={me?.fullName ?? me?.username ?? '?'}
                        size="sm"
                      />
                    ) : (
                      <span className="block w-8" aria-hidden />
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={cn('flex gap-2', sameSenderAsPrev ? 'mt-0.5' : 'mt-2')}
              >
                <div className="w-8 shrink-0 pt-5">
                  {!sameSenderAsPrev ? (
                    <Avatar
                      src={avatarSrc}
                      fallback={label}
                      size="sm"
                    />
                  ) : (
                    <span className="block w-8" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 max-w-[min(85%,20rem)] flex-1">
                  {!sameSenderAsPrev ? (
                    <p className="mb-0.5 text-xs font-semibold text-[var(--text)]">
                      {label}
                      {sender?.username || m.fromUsername ? (
                        <span className="ml-1.5 font-normal text-[var(--text-muted)]">
                          @{sender?.username || m.fromUsername}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                  <div className="rounded-2xl bg-surface2 px-3 py-2 text-sm leading-snug text-[var(--text)] dark:bg-[#242526]">
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-sm text-[var(--text-muted)]">
            Send a message to the group.
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-[var(--border)] p-3 dark:border-slate-700/50"
        onSubmit={(e) => {
          e.preventDefault();
          void onSend();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
        />
        <Button type="submit" disabled={!text.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
