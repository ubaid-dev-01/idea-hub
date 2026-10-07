'use client';

import { useParams } from 'next/navigation';

import { FollowListPageView } from '@/components/profile/FollowListSheet';

export default function FollowersListPage() {
  const params = useParams();
  const username = params.username as string;

  return <FollowListPageView username={username} kind="followers" />;
}
