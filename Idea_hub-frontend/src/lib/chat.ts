import {
  child,
  get,
  increment,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  update,
  type Database,
} from 'firebase/database';

import type { IUser } from '@/types/api';

export type ChatMessage = {
  id: string;
  chatId: string;
  fromUserId: string;
  /** DM only; omitted for group messages. */
  toUserId?: string;
  text: string;
  createdAt: number;
  kind?: 'dm' | 'group';
  /** Group: sender label at send time. */
  fromDisplayName?: string;
  /** Group: @username at send time. */
  fromUsername?: string;
  /** Group: profile photo URL at send time. */
  fromAvatarUrl?: string;
};

/** Stored on group meta so clients can show avatars without extra API calls. */
export type GroupMemberPreview = {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl: string;
};

export type GroupChatMeta = {
  type: 'group';
  name: string;
  memberIds: string[];
  /** uid → true — used by RTDB security rules */
  membersMap?: Record<string, boolean>;
  /** Profile snapshots for member list + fallbacks (optional on older groups). */
  members?: GroupMemberPreview[];
  createdBy: string;
  createdAt: number;
};

export type ChatThreadRow = {
  chatId: string;
  kind?: 'dm' | 'group';
  groupName?: string;
  peerId: string;
  peerUsername: string;
  peerFullName: string;
  peerAvatarUrl: string;
  lastText: string;
  lastAt: number;
  unreadCount: number;
};

export function chatIdFor(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export async function sendChatMessage(
  db: Database,
  from: IUser,
  to: IUser,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const chatId = chatIdFor(from._id, to._id);
  const msgRef = push(ref(db, `chats/${chatId}/messages`));
  const id = msgRef.key!;
  const now = Date.now();

  const msg: ChatMessage = {
    id,
    chatId,
    fromUserId: from._id,
    toUserId: to._id,
    text: trimmed,
    createdAt: now,
    kind: 'dm',
  };

  const baseThread = {
    chatId,
    lastText: trimmed,
    lastAt: now,
  };

  await set(msgRef, msg);

  // Update both users' inbox rows.
  await update(ref(db), {
    [`userChats/${from._id}/${chatId}`]: {
      ...baseThread,
      kind: 'dm',
      peerId: to._id,
      peerUsername: to.username,
      peerFullName: to.fullName,
      peerAvatarUrl: to.avatarUrl,
      unreadCount: 0,
      updatedAt: serverTimestamp(),
    },
    [`userChats/${to._id}/${chatId}`]: {
      ...baseThread,
      kind: 'dm',
      peerId: from._id,
      peerUsername: from.username,
      peerFullName: from.fullName,
      peerAvatarUrl: from.avatarUrl,
      unreadCount: increment(1),
      updatedAt: serverTimestamp(),
    },
  });
}

export async function createGroupChat(
  db: Database,
  creator: IUser,
  name: string,
  members: IUser[]
): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Group name is required');
  const chatRef = push(ref(db, 'chats'));
  const groupId = chatRef.key!;
  const memberIds = [
    ...new Set(
      [creator._id, ...members.map((m) => m._id)].filter(
        (id): id is string => Boolean(id && typeof id === 'string')
      )
    ),
  ];
  const now = Date.now();
  const membersPreview: GroupMemberPreview[] = [];
  const seenPreview = new Set<string>();
  const pushPreview = (u: IUser) => {
    const id = String(u._id);
    if (seenPreview.has(id)) return;
    seenPreview.add(id);
    membersPreview.push({
      userId: id,
      username: u.username,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl ?? '',
    });
  };
  pushPreview(creator);
  for (const m of members) pushPreview(m);

  const meta: GroupChatMeta = {
    type: 'group',
    name: trimmed,
    memberIds,
    members: membersPreview,
    membersMap: Object.fromEntries(memberIds.map((id) => [id, true])),
    createdBy: creator._id,
    createdAt: now,
  };
  await set(ref(db, `chats/${groupId}/meta`), meta);
  const preview = `${creator.fullName || creator.username} created the group`;
  const updates: Record<string, unknown> = {};
  for (const uid of memberIds) {
    updates[`userChats/${uid}/${groupId}`] = {
      chatId: groupId,
      kind: 'group',
      groupName: trimmed,
      peerId: '',
      peerUsername: '',
      peerFullName: trimmed,
      peerAvatarUrl: '',
      lastText: preview,
      lastAt: now,
      unreadCount: 0,
      updatedAt: serverTimestamp(),
    };
  }
  await update(ref(db), updates);
  return groupId;
}

export async function sendGroupMessage(
  db: Database,
  groupId: string,
  from: IUser,
  memberIds: string[],
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const msgRef = push(ref(db, `chats/${groupId}/messages`));
  const id = msgRef.key!;
  const now = Date.now();
  const msg: ChatMessage = {
    id,
    chatId: groupId,
    fromUserId: from._id,
    text: trimmed,
    createdAt: now,
    kind: 'group',
    fromDisplayName: from.fullName || from.username,
    fromUsername: from.username,
    fromAvatarUrl: from.avatarUrl ?? '',
  };
  await set(msgRef, msg);

  // Use numeric unread counts (read + write) instead of increment() in a
  // multi-path update — some RTDB rule / client combinations reject increment
  // fan-out to many userChats paths while plain numbers behave like DMs.
  const unique = [...new Set(memberIds)].filter(
    (id): id is string => Boolean(id && typeof id === 'string')
  );
  if (!unique.includes(from._id)) {
    unique.push(from._id);
  }

  const unreadCounts = await Promise.all(
    unique.map(async (uid) => {
      if (uid === from._id) return { uid, unread: 0 };
      const snap = await get(child(ref(db), `userChats/${uid}/${groupId}`));
      const prev = snap.exists() ? (snap.val() as ChatThreadRow) : null;
      const unread = (Number(prev?.unreadCount) || 0) + 1;
      return { uid, unread };
    })
  );

  const updates: Record<string, unknown> = {};
  for (const { uid, unread } of unreadCounts) {
    updates[`userChats/${uid}/${groupId}/lastText`] = trimmed;
    updates[`userChats/${uid}/${groupId}/lastAt`] = now;
    updates[`userChats/${uid}/${groupId}/unreadCount`] = unread;
    updates[`userChats/${uid}/${groupId}/updatedAt`] = serverTimestamp();
  }
  await update(ref(db), updates);
}

export async function markChatRead(
  db: Database,
  userId: string,
  chatId: string
): Promise<void> {
  await update(ref(db, `userChats/${userId}/${chatId}`), {
    unreadCount: 0,
    updatedAt: serverTimestamp(),
  });
}

export async function getUserChatRow(
  db: Database,
  userId: string,
  chatId: string
): Promise<ChatThreadRow | null> {
  const snap = await get(child(ref(db), `userChats/${userId}/${chatId}`));
  return snap.exists() ? (snap.val() as ChatThreadRow) : null;
}

