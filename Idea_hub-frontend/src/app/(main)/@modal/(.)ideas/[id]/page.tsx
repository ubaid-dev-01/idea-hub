'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { IdeaDetailSkeleton } from '@/components/idea/IdeaDetail';
import { IdeaDetailSplit } from '@/components/idea/IdeaDetailSplit';
import { useIdea } from '@/hooks/useIdeas';
import { useIsDesktopModal } from '@/hooks/useMediaQuery';

export default function IdeaModalPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const isDesktop = useIsDesktopModal();
  const [mounted, setMounted] = useState(false);
  const { data, isLoading, isError } = useIdea(id);

  useEffect(() => setMounted(true), []);

  if (!mounted || !isDesktop) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-6">
        <div className="w-full max-w-lg rounded-xl bg-[var(--surface)] p-6 dark:bg-[#18191a]">
          <IdeaDetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  return (
    <IdeaDetailSplit
      idea={data}
      variant="modal"
      onClose={() => router.back()}
    />
  );
}
