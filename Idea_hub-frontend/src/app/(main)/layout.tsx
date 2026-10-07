import { MainShell } from '@/components/layout/MainShell';

export default function MainLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <MainShell>
      {children}
      {modal}
    </MainShell>
  );
}
