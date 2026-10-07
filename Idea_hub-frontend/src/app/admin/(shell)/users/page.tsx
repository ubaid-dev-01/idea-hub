'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { adminApi } from '@/lib/api/admin.api';
import { extractApiError } from '@/lib/api/errors';
import { useAuthStore } from '@/store/authStore';
import type { IUser, UserRole, UserStatus } from '@/types/api';

const ROLES: UserRole[] = [
  'user',
  'collaborator',
  'moderator',
  'super_admin',
];
const STATUSES: UserStatus[] = [
  'active',
  'inactive',
  'banned',
  'pending_verification',
];

function UserRow({ user }: { user: IUser }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [fullName, setFullName] = useState(user.fullName);
  const [bio, setBio] = useState(user.bio ?? '');
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setBio(user.bio ?? '');
  }, [user]);

  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['admin', 'users'] });

  const roleMut = useMutation({
    mutationFn: (role: string) => adminApi.updateUserRole(user._id, role),
    onSuccess: () => {
      toast.success('Role updated');
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      adminApi.updateUserStatus(user._id, status, 'admin'),
    onSuccess: () => {
      toast.success('Status updated');
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const profileMut = useMutation({
    mutationFn: () =>
      adminApi.updateUser(user._id, { fullName: fullName.trim(), bio }),
    onSuccess: () => {
      toast.success('Profile saved');
      setOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => adminApi.deleteUser(user._id),
    onSuccess: () => {
      toast.success('User removed');
      invalidate();
    },
    onError: (e) => toast.error(extractApiError(e)),
  });

  const isSelf = me?._id === user._id;

  return (
    <>
      <tr className="border-b border-cyan-500/10 align-top">
        <td className="p-3">
          <p className="font-medium text-white">@{user.username}</p>
          {open ? (
            <div className="mt-2 space-y-2">
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="border-cyan-500/20 bg-[#070d16] text-sm text-white"
                placeholder="Full name"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#070d16] p-2 text-sm text-white"
                placeholder="Bio"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-cyan-600 text-[#070d16] hover:bg-cyan-500"
                  loading={profileMut.isPending}
                  onClick={() => profileMut.mutate()}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="mt-1 text-xs text-cyan-400 hover:underline"
              onClick={() => setOpen(true)}
            >
              Edit name / bio
            </button>
          )}
        </td>
        <td className="p-3 text-sm text-slate-400">{user.email}</td>
        <td className="p-3">
          <select
            className="w-full max-w-[140px] rounded-lg border border-cyan-500/25 bg-[#0b111b] px-2 py-1.5 text-xs text-slate-200"
            value={user.role}
            disabled={roleMut.isPending || isSelf}
            title={isSelf ? 'Use another admin to change your role' : undefined}
            onChange={(e) => roleMut.mutate(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </td>
        <td className="p-3">
          <select
            className="w-full max-w-[160px] rounded-lg border border-cyan-500/25 bg-[#0b111b] px-2 py-1.5 text-xs text-slate-200"
            value={user.status}
            disabled={statusMut.isPending}
            onChange={(e) => statusMut.mutate(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </td>
        <td className="p-3">
          <div className="flex flex-col gap-2">
            <Badge variant="muted" className="w-fit border-cyan-500/20 text-slate-300">
              {user.status === 'banned'
                ? 'Disabled'
                : user.status === 'inactive'
                  ? 'Inactive'
                  : 'OK'}
            </Badge>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="w-full max-w-[120px]"
              disabled={isSelf || deleteMut.isPending}
              title={
                isSelf ? 'You cannot delete yourself' : 'Permanently remove user'
              }
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </div>
        </td>
      </tr>
    </>
  );
}

export default function AdminUsersPage() {
  const q = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers({}),
  });

  if (q.isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl bg-cyan-500/10" />;
  }

  if (q.isError) {
    return (
      <div className="rounded-xl border border-red-500/30 p-6 text-red-300">
        {extractApiError(q.error)}
        <Button className="mt-4" onClick={() => void q.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const users = q.data?.users ?? [];

  return (
    <div className="w-full min-w-0 max-w-full">
      <h1 className="mb-2 text-2xl font-bold text-white">Users</h1>
      <p className="mb-6 text-sm text-slate-400">
        Role, status, profile edits, and full delete (with all posts & related
        data). You cannot delete yourself or the last super admin.
      </p>
      {!users.length ? (
        <p className="text-slate-500">No users found.</p>
      ) : (
        <div className="min-w-0 max-w-full overflow-x-auto rounded-xl border border-cyan-500/20 bg-[#0b111b]/50 [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-cyan-500/15 bg-cyan-500/5">
              <tr>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  User
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Email
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Role
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Status
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wide text-cyan-200/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u._id} user={u} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
