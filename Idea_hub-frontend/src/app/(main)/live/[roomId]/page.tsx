'use client';

import { useParams } from 'next/navigation';

import { LiveRoomView } from '@/components/live/LiveRoomView';
import { AuthGuard } from '@/components/providers/AuthGuard';

export default function LiveRoomPage() {
  const params = useParams();
  const roomId = typeof params.roomId === 'string' ? params.roomId : '';

  if (!roomId) {
    return (
      <div className="p-6 text-sm text-[var(--text-muted)]">Invalid room</div>
    );
  }

  return (
    <AuthGuard>
      <LiveRoomView roomId={roomId} />
    </AuthGuard>
  );
}
