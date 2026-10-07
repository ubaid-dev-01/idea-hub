import { redirect } from 'next/navigation';

/** `/profile` → `/profile/me` (resolves guest vs own profile redirect client-side). */
export default function ProfileIndexPage() {
  redirect('/profile/me');
}
