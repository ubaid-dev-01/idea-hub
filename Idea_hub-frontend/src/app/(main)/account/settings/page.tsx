'use client';

import { useMutation } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { Button } from '@/components/ui/Button';
import { ICONS } from '@/lib/icons';
import { usersApi } from '@/lib/api/users.api';
import { useAuthStore } from '@/store/authStore';

function Content() {
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [verifyNote, setVerifyNote] = useState('');

  const verifyMut = useMutation({
    mutationFn: () => usersApi.requestInnovatorVerification(verifyNote.trim()),
    onSuccess: (u) => {
      updateUser(u);
      toast.success('Request submitted');
      setVerifyNote('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 dark:border-slate-700/50 dark:bg-[#18191a]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ICONS.settings />
            <div>
              <p className="font-semibold text-[var(--text)]">Appearance</p>
              <p className="text-sm text-[var(--text-muted)]">
                Light, dark, or match system
              </p>
            </div>
          </div>
          <select
            value={theme ?? 'system'}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-surface2 px-3 py-2 text-sm dark:bg-[#242526]"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 dark:border-slate-700/50 dark:bg-[#18191a]">
        <div>
          <p className="font-semibold text-[var(--text)]">Verified innovator</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Request a blue check for notable builders. Staff reviews requests and
            may verify your profile manually.
          </p>
        </div>
        {user?.verifiedInnovator ? (
          <p className="text-sm font-medium text-sky-600 dark:text-sky-400">
            You are verified.
          </p>
        ) : user?.verificationRequestAt ? (
          <p className="text-sm text-[var(--text-muted)]">
            Request received{' '}
            {new Date(user.verificationRequestAt).toLocaleString()}. We will
            review it soon.
          </p>
        ) : (
          <>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-surface2 p-3 text-sm dark:bg-[#242526]"
              placeholder="Tell us why you should be verified (links, portfolio, press, etc.)"
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
            />
            <Button
              type="button"
              loading={verifyMut.isPending}
              onClick={() => verifyMut.mutate()}
            >
              Submit verification request
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <AuthGuard>
      <h1 className="mb-4 text-xl font-bold text-[var(--text)]">Settings</h1>
      <Content />
    </AuthGuard>
  );
}
