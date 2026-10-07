'use client';

import { useParams } from 'next/navigation';

import { FollowListPageView } from '@/components/profile/FollowListSheet';

export default function FollowingListPage() {
  const params = useParams();
  const username = params.username as string;

  return <FollowListPageView username={username} kind="following" />;
}
