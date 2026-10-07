'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAdminTheme } from '@/components/admin/AdminThemeContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/components/ui/cn';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';

export default function AdminSettingsPage() {
  const { isLight } = useAdminTheme();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [saEmail, setSaEmail] = useState('');
  const [saUsername, setSaUsername] = useState('');
  const [saFullName, setSaFullName] = useState('');
  const [saPassword, setSaPassword] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setUsername(user.username);
    }
  }, [user?.fullName, user?.username, user?._id]);

  const profileMut = useMutation({
    mutationFn: () =>
      adminApi.patchMe({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        ...(newPassword
          ? {
              currentPassword,
              newPassword,
            }
          : {}),
      }),
    onSuccess: (u) => {
      updateUser(u);
      toast.success('Profile updated');
      setCurrentPassword('');
      setNewPassword('');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const createSaMut = useMutation({
    mutationFn: () =>
      adminApi.createSuperAdmin({
        email: saEmail.trim().toLowerCase(),
        username: saUsername.trim().toLowerCase(),
        fullName: saFullName.trim(),
        password: saPassword,
      }),
    onSuccess: () => {
      toast.success('Super admin created — they can log in with that email.');
      setSaEmail('');
      setSaUsername('');
      setSaFullName('');
      setSaPassword('');
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const shell = cn(
    'rounded-xl border p-4',
    isLight
      ? 'border-slate-200 bg-white shadow-sm'
      : 'border-cyan-500/15 bg-[#0b111b]/65'
  );
  const label = cn(
    'mb-1 block text-[10px] font-semibold uppercase tracking-wide',
    isLight ? 'text-slate-600' : 'text-cyan-200/60'
  );
  const inputClass = isLight
    ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
    : 'border-cyan-500/20 bg-[#070d16] text-white placeholder:text-slate-500';

  const isSuper = user?.role === 'super_admin';

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div>
        <h1
          className={cn(
            'text-lg font-bold tracking-tight md:text-xl',
            isLight ? 'text-slate-900' : 'text-white'
          )}
        >
          Settings
        </h1>
        <p
          className={cn(
            'text-[11px]',
            isLight ? 'text-slate-500' : 'text-slate-500'
          )}
        >
          Update your display name, username, or password. Login email stays the
          same.
        </p>
      </div>

      <section className={shell}>
        <h2
          className={cn(
            'mb-3 text-sm font-semibold',
            isLight ? 'text-slate-800' : 'text-white'
          )}
        >
          Your profile
        </h2>
        <p
          className={cn(
            'mb-4 text-xs',
            isLight ? 'text-slate-500' : 'text-slate-400'
          )}
        >
          Email (login):{' '}
          <span className="font-mono text-[11px]">{user?.email ?? '—'}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ad-full">
              Full name
            </label>
            <Input
              id="ad-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={label} htmlFor="ad-user">
              Username
            </label>
            <Input
              id="ad-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={label} htmlFor="ad-cur">
              Current password
            </label>
            <Input
              id="ad-cur"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              placeholder="Only if changing password"
            />
          </div>
          <div>
            <label className={label} htmlFor="ad-new">
              New password
            </label>
            <Input
              id="ad-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="Min 8 characters"
            />
          </div>
        </div>
        <Button
          type="button"
          className={cn(
            'mt-4',
            isLight
              ? 'bg-cyan-600 text-white hover:bg-cyan-500'
              : 'border-0 bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#070d16]'
          )}
          loading={profileMut.isPending}
          onClick={() => profileMut.mutate()}
        >
          Save changes
        </Button>
      </section>

      {isSuper ? (
        <section className={shell}>
          <h2
            className={cn(
              'mb-1 text-sm font-semibold',
              isLight ? 'text-slate-800' : 'text-white'
            )}
          >
            Create super admin
          </h2>
          <p
            className={cn(
              'mb-4 text-xs',
              isLight ? 'text-slate-500' : 'text-slate-400'
            )}
          >
            Adds another super_admin to the database (active, email verified).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="sa-email">
                Email
              </label>
              <Input
                id="sa-email"
                type="email"
                value={saEmail}
                onChange={(e) => setSaEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={label} htmlFor="sa-user">
                Username
              </label>
              <Input
                id="sa-user"
                value={saUsername}
                onChange={(e) => setSaUsername(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="sa-name">
                Full name
              </label>
              <Input
                id="sa-name"
                value={saFullName}
                onChange={(e) => setSaFullName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="sa-pw">
                Password
              </label>
              <Input
                id="sa-pw"
                type="password"
                value={saPassword}
                onChange={(e) => setSaPassword(e.target.value)}
                className={inputClass}
                placeholder="Min 8 characters"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className={cn(
              'mt-4',
              isLight ? 'border-slate-200 bg-slate-100 text-slate-900' : ''
            )}
            loading={createSaMut.isPending}
            disabled={
              !saEmail.trim() ||
              !saUsername.trim() ||
              !saFullName.trim() ||
              saPassword.length < 8
            }
            onClick={() => createSaMut.mutate()}
          >
            Create super admin
          </Button>
        </section>
      ) : (
        <p
          className={cn(
            'text-xs',
            isLight ? 'text-slate-500' : 'text-slate-500'
          )}
        >
          Only super admins can create additional super admin accounts.
        </p>
      )}
    </div>
  );
}
