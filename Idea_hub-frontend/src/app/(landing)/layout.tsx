import type { Metadata } from 'next';

import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';

export const metadata: Metadata = {
  title: 'Idea Hub | Where serious ideas become products',
  description:
    'The operating system for serious ideation — share, validate, match, and launch with founders, researchers, and operators.',
  openGraph: {
    title: 'Idea Hub',
    description:
      'Where serious ideas become accountable products. Feedback, validation, matching, and launch narratives in one place.',
    type: 'website',
  },
};

export default function LandingLayout({
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
