import { AdminLayoutShell } from '@/components/admin/AdminLayoutShell';
import { AuthGuard } from '@/components/providers/AuthGuard';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard roles={['super_admin', 'moderator']}>
      <AdminLayoutShell>{children}</AdminLayoutShell>
    </AuthGuard>
  );
}
