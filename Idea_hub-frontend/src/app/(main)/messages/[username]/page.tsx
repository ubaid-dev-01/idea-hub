'use client';

import { onValue, push, ref } from 'firebase/database';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { usersApi } from '@/lib/api/users.api';
import { chatIdFor, markChatRead, sendChatMessage, type ChatMessage } from '@/lib/chat';
import { ensureFirebaseAuth } from '@/lib/firebase-auth';
import {
  hasFirebaseClientConfig,
  missingFirebaseClientConfigKeys,
  tryGetFirebaseDb,
} from '@/lib/firebase.client';
import { pushWithViewTransition } from '@/lib/viewTransitions';
import { useAuthStore } from '@/store/authStore';
import type { IUser } from '@/types/api';

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}

function ChatContent() {
  const router = useRouter();
  const params = useParams();
  const username = String(params.username ?? '');
  const me = useAuthStore((s) => s.user);

  const [peer, setPeer] = useState<IUser | null>(null);
  const [loadingPeer, setLoadingPeer] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingPeer(true);
      try {
        const u = await usersApi.getByUsername(username);
        if (!cancelled) setPeer(u);
      } finally {
        if (!cancelled) setLoadingPeer(false);
      }
    }
    if (username) void load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const chatId = useMemo(() => {
    if (!me || !peer) return '';
    return chatIdFor(me._id, peer._id);
  }, [me?._id, peer?._id]);

  useEffect(() => {
    if (!me || !peer || !chatId) return;
    const db = tryGetFirebaseDb();
    if (!db) return;
    let unsub: (() => void) | undefined;
    void ensureFirebaseAuth(me._id)
      .then(() => {
        const r = ref(db, `chats/${chatId}/messages`);
        unsub = onValue(r, (snap) => {
          const v = (snap.val() ?? {}) as Record<string, ChatMessage>;
          const list = Object.values(v)
            .filter(Boolean)
            .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
          setMessages(list);
          void markChatRead(db, me._id, chatId);
        });
      })
      .catch((err) => {
        console.error('[chat] firebase auth / listen failed', err);
      });
    return () => {
      unsub?.();
    };
  }, [chatId, me?._id, peer?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const onSend = async () => {
    if (!me || !peer) return;
    const db = tryGetFirebaseDb();
    if (!db) {
      toast.error('Chat is not configured (missing Firebase env).');
      return;
    }
    try {
      await ensureFirebaseAuth(me._id);
      await sendChatMessage(db, me, peer, text);
      setText('');
    } catch (e) {
      const err = e as { code?: string; message?: string };
      const msg =
        err?.code === 'PERMISSION_DENIED' ||
        /PERMISSION_DENIED/i.test(String(err?.message ?? e))
          ? 'Permission denied — sign in again, or publish Firebase RTDB rules from Idea_hub-backend/database.rules.json'
          : e instanceof Error
            ? e.message
            : 'Could not send message';
      console.error('[chat] send failed', e);
      toast.error(msg);
    }
  };

  if (loadingPeer) {
    return <p className="text-sm text-[var(--text-muted)]">Loading chat…</p>;
  }

  if (!peer) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600">User not found.</p>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Go back
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
        <Link
          href={`/profile/${peer.username}`}
          className="flex min-w-0 items-center gap-2"
        >
          <Avatar
            src={peer.avatarUrl}
            fallback={peer.fullName ?? peer.username ?? '?'}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--text)]">
              {peer.fullName || peer.username}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              @{peer.username}
            </p>
          </div>
        </Link>
      </header>

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
          messages.map((m) => {
            const mine = m.fromUserId === me?._id;
            return (
              <div
                key={m.id}
                className={cn('flex', mine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug',
                    mine
                      ? 'bg-brand text-white'
                      : 'bg-surface2 text-[var(--text)] dark:bg-[#242526]'
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-sm text-[var(--text-muted)]">
            Say hi to start the conversation.
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
          placeholder="Type a message…"
        />
        <Button type="submit" disabled={!text.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

