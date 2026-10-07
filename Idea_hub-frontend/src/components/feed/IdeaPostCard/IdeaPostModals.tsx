'use client';

import { lazy, memo, Suspense } from 'react';

import { useIdeaPostCard } from './IdeaPostCardContext';

const LikesModal = lazy(() =>
  import('@/components/feed/LikesModal').then((m) => ({ default: m.LikesModal }))
);
const CollabRequestModal = lazy(() =>
  import('@/components/feed/CollabRequestModal').then((m) => ({
    default: m.CollabRequestModal,
  }))
);
const ConfirmModal = lazy(() =>
  import('@/components/ui/ConfirmModal').then((m) => ({ default: m.ConfirmModal }))
);

function IdeaPostModalsInner() {
  const {
    idea,
    likesOpen,
    setLikesOpen,
    collabOpen,
    setCollabOpen,
    delOpen,
    setDelOpen,
    deleteMut,
  } = useIdeaPostCard();

  return (
    <Suspense fallback={null}>
      <LikesModal
        ideaId={idea._id}
        open={likesOpen}
        onClose={() => setLikesOpen(false)}
      />
      <CollabRequestModal
        ideaId={idea._id}
        open={collabOpen}
        onClose={() => setCollabOpen(false)}
      />
      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={() => deleteMut.mutateAsync()}
        title="Delete this idea?"
        confirmLabel="Delete"
        loading={deleteMut.isPending}
      >
        This cannot be undone.
      </ConfirmModal>
    </Suspense>
  );
}

export const IdeaPostModals = memo(IdeaPostModalsInner);
