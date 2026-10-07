'use client';

import { Camera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useUpload } from '@/hooks/useUpload';
import { usersApi } from '@/lib/api/users.api';
import { useAuthStore } from '@/store/authStore';
import type { IUser } from '@/types/api';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: IUser;
  onUpdated?: (user: IUser) => void;
};

export function EditProfileModal({
  isOpen,
  onClose,
  user,
  onUpdated,
}: Props) {
  const updateUser = useAuthStore((s) => s.updateUser);
  const { uploadFile } = useUpload();
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? '');
  const [skills, setSkills] = useState((user.skills ?? []).join(', '));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFullName(user.fullName);
    setUsername(user.username);
    setBio(user.bio ?? '');
    setSkills((user.skills ?? []).join(', '));
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [isOpen, user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4MB');
      return;
    }
    setAvatarFile(f);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile);
      }
      const updated = await usersApi.updateMe({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim(),
        skills,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      updateUser(updated);
      onUpdated?.(updated);
      toast.success('Profile saved');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = avatarPreview || user.avatarUrl || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit profile"
      size="full"
      className="md:max-w-lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-profile-form"
            variant="primary"
            loading={saving}
          >
            Save
          </Button>
        </div>
      }
    >
      <form
        id="edit-profile-form"
        onSubmit={handleSubmit}
        className="space-y-5 px-4 py-4"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[var(--color-border)] bg-surface2 dark:border-gray-600">
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={Boolean(avatarPreview)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[var(--text-muted)]">
                  No photo
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md transition hover:bg-[var(--color-border-light)] dark:border-gray-600"
              aria-label="Change profile photo"
            >
              <Camera size={18} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickAvatar}
            />
          </div>
          <p className="text-center text-xs text-[var(--text-muted)]">
            Photo · Name · Username · Bio — like Instagram
          </p>
        </div>

        <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 dark:border-slate-700/50 dark:bg-[#18191a]">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Connections
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/profile/${user.username}/followers`}
                onClick={onClose}
                className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:underline dark:bg-indigo-500/15"
              >
                {user.followerCount} followers
              </Link>
              <Link
                href={`/profile/${user.username}/following`}
                onClick={onClose}
                className="rounded-lg bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:underline dark:bg-indigo-500/15"
              >
                {user.followingCount} following
              </Link>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="ep-fullName"
            className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
          >
            Name
          </label>
          <input
            id="ep-fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input w-full"
            maxLength={120}
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label
            htmlFor="ep-username"
            className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
          >
            Username
          </label>
          <input
            id="ep-username"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))
            }
            className="input w-full"
            maxLength={30}
            required
            autoComplete="username"
            spellCheck={false}
          />
        </div>

        <div>
          <label
            htmlFor="ep-bio"
            className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
          >
            Bio
          </label>
          <textarea
            id="ep-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input min-h-[100px] w-full resize-y py-2"
            maxLength={500}
            placeholder="Tell people about you…"
          />
          <p className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
            {bio.length}/500
          </p>
        </div>

        <div>
          <label
            htmlFor="ep-skills"
            className="mb-1 block text-xs font-medium text-[var(--text-muted)]"
          >
            Skills (comma-separated)
          </label>
          <input
            id="ep-skills"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="input w-full"
            placeholder="design, react, startups"
          />
        </div>
      </form>
    </Modal>
  );
}
