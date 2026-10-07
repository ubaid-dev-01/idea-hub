'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { IdeaPostCard } from '@/components/feed/IdeaPostCard';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api/axios';
import type { ApiResponse, IIdea, IUser } from '@/types/api';
import { useAuthStore } from '@/store/authStore';

type CollectionDetail = {
  collection: {
    _id: string;
    ownerId: string;
    name: string;
    description: string;
    followerCount: number;
    ideaCount: number;
    following?: boolean;
  };
  owner: IUser | null;
  ideas: IIdea[];
};

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['collection', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<CollectionDetail>>(
        `/collections/${id}`
      );
      if (!res.data.success || !res.data.data) {
        throw new Error(res.data.message || 'Not found');
      }
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const followMut = useMutation({
    mutationFn: async () => {
      const following = q.data?.collection.following;
      if (following) {
        await api.delete<ApiResponse<unknown>>(`/collections/${id}/follow`);
      } else {
        await api.post<ApiResponse<unknown>>(`/collections/${id}/follow`);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['collection', id] });
      toast.success('Updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <p className="p-8 text-center text-sm text-[var(--text-muted)]">Loading…</p>
    );
  }

  if (q.isError || !q.data) {
    return (
      <p className="p-8 text-center text-sm text-[var(--text-muted)]">
        Collection not found
      </p>
    );
  }

  const { collection, owner, ideas } = q.data;
  const isOwner = user && user._id === collection.ownerId;

  return (
    <div className="mx-auto max-w-xl space-y-4 py-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 dark:border-slate-700/50 dark:bg-[#18191a]">
        <h1 className="text-xl font-bold text-[var(--text)]">{collection.name}</h1>
        {collection.description ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {collection.description}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          {collection.ideaCount} ideas · {collection.followerCount} followers
          {owner ? (
            <>
              {' '}
              · curator{' '}
              <Link
                href={`/profile/${owner.username}`}
                className="font-semibold text-brand hover:underline"
              >
                @{owner.username}
              </Link>
            </>
          ) : null}
        </p>
        {user && !isOwner ? (
          <Button
            type="button"
            className="mt-4"
            variant={collection.following ? 'secondary' : 'primary'}
            loading={followMut.isPending}
            onClick={() => followMut.mutate()}
          >
            {collection.following ? 'Unfollow' : 'Follow collection'}
          </Button>
        ) : null}
      </div>
      <div className="space-y-4">
        {ideas.map((idea) => (
          <IdeaPostCard key={idea._id} idea={idea} currentUserId={user?._id} />
        ))}
      </div>
    </div>
  );
}
