'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { usersApi } from '@/lib/api/users.api';
import { createGroupChat } from '@/lib/chat';
import { ensureFirebaseAuth } from '@/lib/firebase-auth';
import { tryGetFirebaseDb } from '@/lib/firebase.client';
import { pushWithViewTransition } from '@/lib/viewTransitions';
import { useAuthStore } from '@/store/authStore';
import type { IUser } from '@/types/api';

export default function NewGroupPage() {
  return (
    <AuthGuard>
      <NewGroupContent />
    </AuthGuard>
  );
}

function parseUsernames(raw: string): string[] {
  const parts = raw.split(/[\s,;\n\r]+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const t = p.trim().replace(/^@/, '');
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function NewGroupContent() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [bulkUsernames, setBulkUsernames] = useState('');
  const [members, setMembers] = useState<IUser[]>([]);
  const [bulkAdding, setBulkAdding] = useState(false);

  const followingQ = useQuery({
    queryKey: ['me', 'following'],
    queryFn: () => usersApi.getFollowing(),
    enabled: Boolean(me),
  });

  const following = followingQ.data?.users ?? [];

  const memberIds = useMemo(
    () => new Set(members.map((m) => m._id)),
    [members]
  );

  const toggleUser = useCallback((u: IUser) => {
    if (!me || u._id === me._id) return;
    setMembers((prev) => {
      const has = prev.some((x) => x._id === u._id);
      if (has) return prev.filter((x) => x._id !== u._id);
      return [...prev, u];
    });
  }, [me]);

  const addByUsername = useCallback(async () => {
    const u = addUsername.trim().replace(/^@/, '');
    if (!u || !me) return;
    if (u.toLowerCase() === me.username.toLowerCase()) {
      toast.error('You are already in the group.');
      setAddUsername('');
      return;
    }
    try {
      const user = await usersApi.getByUsername(u);
      if (memberIds.has(user._id)) {
        toast.error('Already added.');
        return;
      }
      setMembers((prev) => [...prev, user]);
      setAddUsername('');
    } catch {
      toast.error('User not found.');
    }
  }, [addUsername, me, memberIds]);

  const addBulkUsernames = useCallback(async () => {
    if (!me) return;
    const names = parseUsernames(bulkUsernames);
    if (!names.length) {
      toast.error('Paste at least one username.');
      return;
    }
    setBulkAdding(true);
    let skipped = 0;
    const toAdd: IUser[] = [];
    const seen = new Set(members.map((m) => m._id));
    try {
      for (const uname of names) {
        if (uname.toLowerCase() === me.username.toLowerCase()) {
          skipped += 1;
          continue;
        }
        try {
          const user = await usersApi.getByUsername(uname);
          if (seen.has(user._id)) {
            skipped += 1;
            continue;
          }
          seen.add(user._id);
          toAdd.push(user);
        } catch {
          skipped += 1;
        }
      }
      if (toAdd.length) {
        setMembers((prev) => [...prev, ...toAdd]);
        toast.success(
          `Added ${toAdd.length} member(s)${skipped ? ` (${skipped} skipped)` : ''}.`
        );
        setBulkUsernames('');
      } else {
        toast.error(
          skipped
            ? 'No new members (duplicates or not found).'
            : 'Could not add members.'
        );
      }
    } finally {
      setBulkAdding(false);
    }
  }, [bulkUsernames, me, members]);

  const followingOthers = useMemo(
    () => following.filter((u) => u._id !== me?._id),
    [following, me?._id]
  );

  const selectAllFollowing = useCallback(() => {
    setMembers((prev) => {
      const ids = new Set(prev.map((x) => x._id));
      const next = [...prev];
      for (const u of followingOthers) {
        if (!ids.has(u._id)) {
          ids.add(u._id);
          next.push(u);
        }
      }
      return next;
    });
  }, [followingOthers]);

  const clearMembers = useCallback(() => setMembers([]), []);

  const createMut = useMutation({
    mutationFn: async () => {
      const db = tryGetFirebaseDb();
      if (!db) throw new Error('Firebase is not configured.');
      if (!me) throw new Error('Not signed in.');
      await ensureFirebaseAuth(me._id);
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Enter a group name.');
      if (members.length < 1) {
        throw new Error('Add at least one other member.');
      }
      return createGroupChat(db, me, trimmed, members);
    },
    onSuccess: (groupId) => {
      pushWithViewTransition(router, `/messages/g/${groupId}`);
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Could not create group.');
    },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">New group</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Add several people: paste many usernames at once, tap names in
          Following, or use one-by-one Add.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text)]">
          Group name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekend build crew"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text)]">
          Add by username
        </label>
        <div className="flex gap-2">
          <Input
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            placeholder="username"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addByUsername();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={() => void addByUsername()}>
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-[var(--text)]">
          Add many usernames (paste)
        </label>
        <textarea
          value={bulkUsernames}
          onChange={(e) => setBulkUsernames(e.target.value)}
          placeholder={
            'alice, bob, charlie\nor one username per line'
          }
          rows={4}
          className="input min-h-[96px] w-full resize-y py-2 text-sm"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={bulkAdding || !bulkUsernames.trim()}
          onClick={() => void addBulkUsernames()}
        >
          {bulkAdding ? 'Adding…' : 'Add all from list'}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text)]">
            From following
          </p>
          {followingOthers.length > 0 ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={selectAllFollowing}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={clearMembers}
                disabled={!members.length}
              >
                Clear members
              </Button>
            </div>
          ) : null}
        </div>
        {!followingOthers.length ? (
          <p className="text-sm text-[var(--text-muted)]">
            You are not following anyone yet. Paste usernames above or use Add
            by username.
          </p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--border)] p-2 dark:border-slate-700/50">
            {followingOthers.map((u) => {
              const selected = memberIds.has(u._id);
              return (
                <li key={u._id}>
                  <button
                    type="button"
                    onClick={() => toggleUser(u)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition',
                      selected
                        ? 'bg-brand/10 dark:bg-indigo-500/15'
                        : 'hover:bg-surface2 dark:hover:bg-[#242526]'
                    )}
                  >
                    <Avatar
                      src={u.avatarUrl}
                      fallback={u.fullName ?? u.username}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {u.fullName}
                      <span className="block text-xs font-normal text-[var(--text-muted)]">
                        @{u.username}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'text-xs font-bold',
                        selected ? 'text-brand' : 'text-[var(--text-muted)]'
                      )}
                    >
                      {selected ? 'Added' : 'Add'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {members.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text)]">
            Members ({members.length})
          </p>
          <ul className="flex flex-wrap gap-2">
            {members.map((u) => (
              <li
                key={u._id}
                className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-surface2 px-2 py-1 text-xs dark:border-slate-600 dark:bg-[#242526]"
              >
                @{u.username}
                <button
                  type="button"
                  className="ml-1 rounded-full px-1 text-[var(--text-muted)] hover:text-red-500"
                  onClick={() =>
                    setMembers((prev) => prev.filter((x) => x._id !== u._id))
                  }
                  aria-label={`Remove ${u.username}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => createMut.mutate()}
          disabled={
            createMut.isPending || !name.trim() || members.length < 1
          }
        >
          {createMut.isPending ? 'Creating…' : 'Create group'}
        </Button>
        <Button type="button" variant="secondary" asChild>
          <Link href="/messages">Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
