'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { LogOut, Mic, Radio, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { liveRoomsApi } from '@/lib/api/live.api';
import { useAuthStore } from '@/store/authStore';
import type { ILiveRoomMessage, IUser } from '@/types/api';

const REACTIONS = ['👍', '💡', '🔥', '❓'] as const;

type Tab = 'chat' | 'qa' | 'poll';

export function LiveRoomView({ roomId }: { roomId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('chat');
  const [joinUrl, setJoinUrl] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [qaInput, setQaInput] = useState('');
  const [pollQ, setPollQ] = useState('');
  const [pollOptA, setPollOptA] = useState('');
  const [pollOptB, setPollOptB] = useState('');
  const [validationScore, setValidationScore] = useState(7);
  const [floaters, setFloaters] = useState<
    Array<{ id: string; emoji: string; x: number }>
  >([]);
  const mockToastShown = useRef(false);

  const roomQuery = useQuery({
    queryKey: ['live-room', roomId],
    queryFn: () => liveRoomsApi.get(roomId),
    refetchInterval: (q) =>
      q.state.data?.status === 'live' ? 2500 : 10_000,
  });

  const room = roomQuery.data;
  const isHost = user && room && String(room.hostId) === String(user._id);

  const messagesQuery = useQuery({
    queryKey: ['live-room', roomId, 'messages'],
    queryFn: () => liveRoomsApi.messages(roomId),
    enabled: Boolean(room?.status === 'live'),
    refetchInterval: room?.status === 'live' ? 2000 : false,
  });

  const questionsQuery = useQuery({
    queryKey: ['live-room', roomId, 'questions'],
    queryFn: () => liveRoomsApi.questions(roomId),
    enabled: Boolean(room?.status === 'live'),
    refetchInterval: room?.status === 'live' ? 3000 : false,
  });

  const liveStatus = room?.status;

  useEffect(() => {
    if (!user || liveStatus !== 'live') {
      setJoinUrl('');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await liveRoomsApi.join(roomId);
        const t = await liveRoomsApi.token(roomId);
        if (cancelled) return;
        setJoinUrl(t.joinUrl || '');
        if ((t.provider === 'mock' || !t.joinUrl) && !mockToastShown.current) {
          mockToastShown.current = true;
          toast(
            'Video is in demo mode — add DAILY_API_KEY on the API for real calls.',
            { icon: 'ℹ️' }
          );
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Could not join call');
        }
      }
    })();
    return () => {
      cancelled = true;
      void liveRoomsApi.leave(roomId).catch(() => undefined);
    };
  }, [roomId, liveStatus, user?._id]);

  const rsvpMut = useMutation({
    mutationFn: () => liveRoomsApi.rsvp(roomId),
    onSuccess: () => {
      toast.success("You're on the list");
      void qc.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelRsvpMut = useMutation({
    mutationFn: () => liveRoomsApi.cancelRsvp(roomId),
    onSuccess: () => {
      toast.success('RSVP removed');
      void qc.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goLiveMut = useMutation({
    mutationFn: () => liveRoomsApi.goLive(roomId),
    onSuccess: () => {
      toast.success('You are live');
      void qc.invalidateQueries({ queryKey: ['live-room', roomId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const endMut = useMutation({
    mutationFn: () => liveRoomsApi.end(roomId),
    onSuccess: () => {
      toast.success('Room ended');
      void qc.invalidateQueries({ queryKey: ['live-room', roomId] });
      router.push('/live');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendChatMut = useMutation({
    mutationFn: (body: string) => liveRoomsApi.sendMessage(roomId, body),
    onSuccess: () => {
      setChatInput('');
      void qc.invalidateQueries({ queryKey: ['live-room', roomId, 'messages'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const askMut = useMutation({
    mutationFn: (body: string) => liveRoomsApi.askQuestion(roomId, body),
    onSuccess: () => {
      setQaInput('');
      void qc.invalidateQueries({ queryKey: ['live-room', roomId, 'questions'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const votePollMut = useMutation({
    mutationFn: (i: number) => liveRoomsApi.votePoll(roomId, i),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['live-room', roomId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const validationMut = useMutation({
    mutationFn: (score: number) => liveRoomsApi.validationVote(roomId, score),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['live-room', roomId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const reactMut = useMutation({
    mutationFn: (emoji: string) => liveRoomsApi.react(roomId, emoji),
    onSuccess: (_, emoji) => {
      void qc.invalidateQueries({ queryKey: ['live-room', roomId] });
      const id = `${Date.now()}-${emoji}`;
      const x = 20 + Math.random() * 60;
      setFloaters((f) => [...f, { id, emoji, x }]);
      setTimeout(() => {
        setFloaters((f) => f.filter((r) => r.id !== id));
      }, 2800);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPollMut = useMutation({
    mutationFn: () =>
      liveRoomsApi.setPoll(roomId, pollQ, [
        pollOptA.trim(),
        pollOptB.trim(),
      ]),
    onSuccess: () => {
      setPollQ('');
      setPollOptA('');
      setPollOptB('');
      void qc.invalidateQueries({ queryKey: ['live-room', roomId] });
      toast.success('Poll started');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const myRole = useMemo(() => {
    if (!user || !room) return null;
    const p = room.participants?.find(
      (x) => String(x.userId) === String(user._id) && !x.leftAt
    );
    return p?.role ?? null;
  }, [room, user]);

  const speakers = useMemo(() => {
    if (!room) return [];
    return room.participants.filter(
      (p) =>
        !p.leftAt &&
        (p.role === 'host' || p.role === 'speaker' || p.role === 'pending_speaker')
    );
  }, [room]);

  const listeners = useMemo(() => {
    if (!room) return [];
    return room.participants.filter((p) => !p.leftAt && p.role === 'listener');
  }, [room]);

  const messages: ILiveRoomMessage[] = messagesQuery.data?.messages ?? [];

  if (roomQuery.isLoading || !room) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--text-muted)]">
        Loading room…
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3 dark:border-slate-700/50">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {room.status === 'live' ? (
              <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-300">
                <Radio className="h-3 w-3 animate-pulse" />
                Live
              </span>
            ) : room.status === 'scheduled' ? (
              <span className="text-[10px] font-semibold uppercase text-amber-600">
                Scheduled
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">
                Ended
              </span>
            )}
          </div>
          <h1 className="truncate text-lg font-semibold text-[var(--text)]">
            {room.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/live"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            All rooms
          </Link>
          {!isHost && room.status === 'scheduled' ? (
            room.hasRsvp ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => cancelRsvpMut.mutate()}
                disabled={cancelRsvpMut.isPending}
              >
                Remove RSVP
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => rsvpMut.mutate()}
                disabled={rsvpMut.isPending}
              >
                RSVP
              </Button>
            )
          ) : null}
          {isHost && room.status === 'scheduled' ? (
            <Button
              type="button"
              size="sm"
              onClick={() => goLiveMut.mutate()}
              disabled={goLiveMut.isPending}
            >
              Go live
            </Button>
          ) : null}
          {isHost && room.status === 'live' ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (window.confirm('End this room for everyone?')) {
                  endMut.mutate();
                }
              }}
              disabled={endMut.isPending}
            >
              End room
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-0 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <div className="relative flex min-h-[320px] flex-col border-b border-[var(--border)] lg:border-b-0 lg:border-r dark:border-slate-700/50">
          <div className="relative flex-1 overflow-hidden bg-slate-900">
            {joinUrl ? (
              <iframe
                title="Live call"
                src={joinUrl}
                className="h-full min-h-[280px] w-full rounded-none lg:rounded-bl-xl"
                allow="camera; microphone; fullscreen; display-capture; autoplay"
              />
            ) : (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-6 text-center text-slate-300">
                <Mic className="h-10 w-10 opacity-40" />
                <p className="text-sm">
                  {room.status === 'live'
                    ? 'Preparing audio & video… (Demo mode without Daily.co)'
                    : 'Start the room to connect audio & video.'}
                </p>
              </div>
            )}

            {floaters.map((f) => (
              <span
                key={f.id}
                className="pointer-events-none absolute bottom-16 text-2xl motion-safe:animate-bounce"
                style={{ left: `${f.x}%` }}
              >
                {f.emoji}
              </span>
            ))}
          </div>

          <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3 dark:border-slate-700/50 dark:bg-[#12141a]">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Speakers
            </p>
            <div className="flex flex-wrap gap-2">
              {speakers.map((p) => (
                <div
                  key={`${p.userId}-${p.joinedAt}`}
                  className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-1 pl-1 pr-3 dark:border-slate-600/50"
                >
                  <Avatar user={p.user} />
                  <span className="max-w-[100px] truncate text-xs font-medium">
                    {p.user?.fullName || p.user?.username || 'User'}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {p.role === 'pending_speaker' ? '✋' : ''}
                  </span>
                  {isHost && p.role === 'pending_speaker' ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() =>
                        liveRoomsApi
                          .approveSpeaker(roomId, p.userId)
                          .then(() =>
                            qc.invalidateQueries({
                              queryKey: ['live-room', roomId],
                            })
                          )
                          .catch((e) =>
                            toast.error(
                              e instanceof Error ? e.message : 'Failed'
                            )
                          )
                      }
                    >
                      Let speak
                    </Button>
                  ) : null}
                  {isHost && p.role === 'speaker' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-[10px]"
                      onClick={() =>
                        liveRoomsApi
                          .demoteSpeaker(roomId, p.userId)
                          .then(() =>
                            qc.invalidateQueries({
                              queryKey: ['live-room', roomId],
                            })
                          )
                          .catch((e) =>
                            toast.error(
                              e instanceof Error ? e.message : 'Failed'
                            )
                          )
                      }
                    >
                      To audience
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Listening ({listeners.length})
            </p>
            <div className="flex max-h-16 flex-wrap gap-1 overflow-y-auto">
              {listeners.map((p) => (
                <div
                  key={`${p.userId}-L`}
                  className="h-8 w-8 overflow-hidden rounded-full border border-[var(--border)]"
                  title={p.user?.username}
                >
                  <Avatar user={p.user} large={false} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="flex min-h-[280px] flex-col bg-[var(--surface)] dark:bg-[#0b111b]">
          <div className="flex border-b border-[var(--border)] dark:border-slate-700/50">
            {(['chat', 'qa', 'poll'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-semibold capitalize',
                  tab === t
                    ? 'border-b-2 border-brand text-[var(--text)]'
                    : 'text-[var(--text-muted)]'
                )}
              >
                {t === 'qa' ? 'Q&A' : t}
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {tab === 'chat' ? (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]">
                  {messages.map((m) => (
                    <div key={m._id} className="text-sm">
                      <span className="font-semibold text-brand">
                        {m.user?.username ?? '…'}
                      </span>
                      <span className="text-[var(--text-muted)]"> · </span>
                      <span className="text-[var(--text)]">{m.body}</span>
                    </div>
                  ))}
                </div>
                <form
                  className="flex gap-2 border-t border-[var(--border)] p-2 dark:border-slate-700/50"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = chatInput.trim();
                    if (t) sendChatMut.mutate(t);
                  }}
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message…"
                    className="text-sm"
                    disabled={room.status !== 'live'}
                  />
                  <Button type="submit" size="sm" disabled={room.status !== 'live'}>
                    Send
                  </Button>
                </form>
              </>
            ) : null}

            {tab === 'qa' ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {(questionsQuery.data ?? []).map((q) => (
                    <div
                      key={q._id}
                      className="rounded-lg border border-[var(--border)] p-2 text-sm dark:border-slate-700/50"
                    >
                      <p className="text-[var(--text)]">{q.body}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {q.status}
                        {isHost && q.status === 'queued' ? (
                          <span className="ml-2 inline-flex gap-1">
                            <button
                              type="button"
                              className="text-brand underline"
                              onClick={() =>
                                liveRoomsApi
                                  .answerQuestion(roomId, q._id)
                                  .then(() =>
                                    questionsQuery.refetch()
                                  )
                              }
                            >
                              Answered
                            </button>
                            <button
                              type="button"
                              className="text-[var(--text-muted)] underline"
                              onClick={() =>
                                liveRoomsApi
                                  .dismissQuestion(roomId, q._id)
                                  .then(() =>
                                    questionsQuery.refetch()
                                  )
                              }
                            >
                              Dismiss
                            </button>
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
                <form
                  className="flex gap-2 border-t border-[var(--border)] p-2 dark:border-slate-700/50"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = qaInput.trim();
                    if (t) askMut.mutate(t);
                  }}
                >
                  <Input
                    value={qaInput}
                    onChange={(e) => setQaInput(e.target.value)}
                    placeholder="Ask the host…"
                    disabled={room.status !== 'live'}
                  />
                  <Button type="submit" size="sm" disabled={room.status !== 'live'}>
                    Ask
                  </Button>
                </form>
              </div>
            ) : null}

            {tab === 'poll' ? (
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
                {room.livePoll && room.livePoll.options.length > 0 ? (
                  <>
                    <p className="text-sm font-medium">{room.livePoll.question}</p>
                    {room.livePoll.options.map((opt, i) => (
                      <button
                        key={opt}
                        type="button"
                        disabled={
                          !room.livePoll?.isActive || room.status !== 'live'
                        }
                        onClick={() => votePollMut.mutate(i)}
                        className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-surface2 dark:border-slate-700/50"
                      >
                        <span>{opt}</span>
                        <span className="text-[var(--text-muted)]">
                          {room.livePoll?.tallies?.[i] ?? 0}
                        </span>
                      </button>
                    ))}
                    {isHost && room.livePoll.isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          liveRoomsApi
                            .closePoll(roomId)
                            .then(() =>
                              qc.invalidateQueries({
                                queryKey: ['live-room', roomId],
                              })
                            )
                        }
                      >
                        Close poll
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">
                    No active poll.
                  </p>
                )}
                {isHost && room.status === 'live' ? (
                  <div className="space-y-2 rounded-xl border border-dashed border-[var(--border)] p-3 dark:border-slate-600/50">
                    <p className="text-xs font-semibold text-[var(--text-muted)]">
                      New poll (host)
                    </p>
                    <Input
                      value={pollQ}
                      onChange={(e) => setPollQ(e.target.value)}
                      placeholder="Question"
                    />
                    <Input
                      value={pollOptA}
                      onChange={(e) => setPollOptA(e.target.value)}
                      placeholder="Option A"
                    />
                    <Input
                      value={pollOptB}
                      onChange={(e) => setPollOptB(e.target.value)}
                      placeholder="Option B"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!pollQ.trim() || !pollOptA.trim() || !pollOptB.trim()) {
                          toast.error('Fill question and two options');
                          return;
                        }
                        setPollMut.mutate();
                      }}
                      disabled={setPollMut.isPending}
                    >
                      Start poll
                    </Button>
                  </div>
                ) : null}

                <div className="rounded-xl border border-[var(--border)] p-3 dark:border-slate-700/50">
                  <p className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)]">
                    <Sparkles className="h-3 w-3" />
                    Rate this idea (1–10)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text)]">
                    {room.validation.average != null
                      ? room.validation.average
                      : '—'}
                    <span className="text-sm font-normal text-[var(--text-muted)]">
                      {' '}
                      ({room.validation.count} votes)
                    </span>
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={validationScore}
                    onChange={(e) =>
                      setValidationScore(Number(e.target.value))
                    }
                    className="mt-2 w-full"
                    disabled={room.status !== 'live'}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={room.status !== 'live'}
                    onClick={() => validationMut.mutate(validationScore)}
                  >
                    Submit score
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-3 backdrop-blur dark:border-slate-700/50 dark:bg-[#0b111b]/95">
        <span className="mr-2 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <Mic className="h-3 w-3" />
          Mic & screen share are in the video frame (Daily)
        </span>
        {myRole === 'listener' && room.status === 'live' ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              liveRoomsApi
                .raiseHand(roomId)
                .then(() =>
                  qc.invalidateQueries({ queryKey: ['live-room', roomId] })
                )
                .catch((e) =>
                  toast.error(e instanceof Error ? e.message : 'Failed')
                )
            }
          >
            Raise hand
          </Button>
        ) : null}
        <div className="flex gap-1">
          {REACTIONS.map((em) => (
            <button
              key={em}
              type="button"
              disabled={room.status !== 'live'}
              onClick={() => reactMut.mutate(em)}
              className="rounded-lg bg-surface2 px-2 py-1 text-lg hover:bg-surface2/80 disabled:opacity-40"
            >
              {em}
            </button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            void liveRoomsApi.leave(roomId);
            router.push('/live');
          }}
        >
          <LogOut className="mr-1 h-3 w-3" />
          Leave
        </Button>
      </footer>
    </div>
  );
}

function Avatar({
  user,
  large = true,
}: {
  user: IUser | null;
  large?: boolean;
}) {
  const sz = large ? 32 : 32;
  if (user?.avatarUrl) {
    return (
      <Image
        src={user.avatarUrl}
        alt=""
        width={sz}
        height={sz}
        className="rounded-full object-cover"
        unoptimized
      />
    );
  }
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-surface2 text-[10px] font-bold text-[var(--text-muted)]',
        large ? 'h-8 w-8' : 'h-8 w-8'
      )}
    >
      {(user?.username ?? '?').slice(0, 1).toUpperCase()}
    </div>
  );
}
