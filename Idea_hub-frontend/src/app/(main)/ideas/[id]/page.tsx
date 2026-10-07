'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { IdeaDetailSkeleton } from '@/components/idea/IdeaDetail';
import { IdeaDetailSplit } from '@/components/idea/IdeaDetailSplit';
import { Button } from '@/components/ui/Button';
import { useIdea } from '@/hooks/useIdeas';
export default function IdeaDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data, isLoading, isError, error, refetch } = useIdea(id);

  if (isLoading) {
    return <IdeaDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center dark:border-slate-700/50 dark:bg-[#18191a]">
        <p className="text-lg font-semibold text-[var(--text)]">Idea not found</p>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {error instanceof Error
            ? error.message
            : 'This idea may have been removed.'}
        </p>
        <Link href="/feed" className="mt-6 inline-block">
          <Button>Back to feed</Button>
        </Link>
        <Button variant="ghost" className="mt-2" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return <IdeaDetailSplit idea={data} variant="page" />;
}
