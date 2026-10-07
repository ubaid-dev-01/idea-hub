import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="landing-root landing-scrollbar relative min-h-screen overflow-x-hidden">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
