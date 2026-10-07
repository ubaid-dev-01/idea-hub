'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/store/authStore';

export default function ProfileMePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.username) {
      router.replace(`/profile/${user.username}`);
    }
  }, [router, user?.username]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
