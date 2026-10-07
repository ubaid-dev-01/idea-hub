'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageCircle, Send, Sparkles } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { coachApi } from '@/lib/api/coach.api';
import { isAiCoachUiEnabled } from '@/lib/ai-coach-ui';
import { useAuthStore } from '@/store/authStore';

type Msg = { role: 'user' | 'coach'; text: string };

export function AICoachWidget() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const ideaMatch = pathname.match(/^\/ideas\/([^/]+)/);
  const contextIdeaId =
    ideaMatch?.[1] && ideaMatch[1] !== 'new' ? ideaMatch[1] : undefined;

  const openingQ = useQuery({
    queryKey: ['coach', 'opening'],
    queryFn: () => coachApi.opening(),
    enabled: Boolean(open && user && isAiCoachUiEnabled()),
  });

  const usageQ = useQuery({
    queryKey: ['coach', 'usage'],
    queryFn: () => coachApi.usage(),
    enabled: Boolean(open && user && isAiCoachUiEnabled()),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!open || !openingQ.data?.openingMessage) return;
    setMsgs((m) => {
      if (m.length > 0) return m;
      return [{ role: 'coach', text: openingQ.data!.openingMessage }];
    });
  }, [open, openingQ.data?.openingMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  const chatMut = useMutation({
    mutationFn: (text: string) =>
      coachApi.chat(text, contextIdeaId),
    onSuccess: (data, text) => {
      setMsgs((m) => [
        ...m,
        { role: 'user', text },
        { role: 'coach', text: data.reply },
      ]);
      setInput('');
      void usageQ.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAiCoachUiEnabled() || !user) return null;

  const limit = usageQ.data?.limit ?? 10;
  const used = usageQ.data?.messagesUsedToday ?? 0;
  const unlimited = usageQ.data?.unlimited ?? false;
  const limitLabel =
    unlimited || limit < 0 ? 'Unlimited' : `${used}/${limit} msgs today`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[280] flex h-14 w-14 items-center justify-center rounded-full shadow-lg md:bottom-8',
          'bg-brand text-white ring-4 ring-brand/25 animate-pulse hover:animate-none hover:ring-brand/40',
          'dark:bg-indigo-500 dark:ring-indigo-500/30'
        )}
        aria-label="Open AI Idea Coach"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[290] flex items-end justify-end p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close coach"
            onClick={() => setOpen(false)}
          />
          <div
            className={cn(
              'relative flex h-[min(560px,85dvh)] w-full max-w-md flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl',
              'dark:border-slate-700/50 dark:bg-[#12141a]'
            )}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 dark:border-slate-700/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-brand" />
                <div>
                  <p className="text-sm font-bold text-[var(--text)]">
                    Your AI Idea Coach
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {limitLabel}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
              {msgs.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user'
                      ? 'ml-auto bg-brand text-white'
                      : 'mr-auto border border-[var(--border)] bg-surface2 dark:border-slate-700/50 dark:bg-[#1a1d24]'
                  )}
                >
                  {m.text}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form
              className="flex gap-2 border-t border-[var(--border)] p-3 dark:border-slate-700/50"
              onSubmit={(e) => {
                e.preventDefault();
                const t = input.trim();
                if (!t || chatMut.isPending) return;
                chatMut.mutate(t);
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your ideas…"
                className="text-sm"
              />
              <Button type="submit" size="sm" disabled={chatMut.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
