'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/authStore';

const sectionFallback = () => (
  <div className="landing-section min-h-[12rem]" aria-hidden />
);

const LandingTrustedBy = dynamic(
  () =>
    import('./sections/LandingTrustedBy').then((m) => ({
      default: m.LandingTrustedBy,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingProblem = dynamic(
  () =>
    import('./sections/LandingProblem').then((m) => ({
      default: m.LandingProblem,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingSolution = dynamic(
  () =>
    import('./sections/LandingSolution').then((m) => ({
      default: m.LandingSolution,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingWorkflow = dynamic(
  () =>
    import('./sections/LandingWorkflow').then((m) => ({
      default: m.LandingWorkflow,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingFeatures = dynamic(
  () =>
    import('./sections/LandingFeatures').then((m) => ({
      default: m.LandingFeatures,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingAiCapabilities = dynamic(
  () =>
    import('./sections/LandingAiCapabilities').then((m) => ({
      default: m.LandingAiCapabilities,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingProductPreview = dynamic(
  () =>
    import('./sections/LandingProductPreview').then((m) => ({
      default: m.LandingProductPreview,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingStats = dynamic(
  () =>
    import('./sections/LandingStats').then((m) => ({
      default: m.LandingStats,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingTestimonials = dynamic(
  () =>
    import('./sections/LandingTestimonials').then((m) => ({
      default: m.LandingTestimonials,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingPricing = dynamic(
  () =>
    import('./sections/LandingPricing').then((m) => ({
      default: m.LandingPricing,
    })),
  { ssr: false, loading: sectionFallback }
);
const LandingFaq = dynamic(
  () =>
    import('./sections/LandingFaq').then((m) => ({ default: m.LandingFaq })),
  { ssr: false, loading: sectionFallback }
);
const LandingFinalCta = dynamic(
  () =>
    import('./sections/LandingFinalCta').then((m) => ({
      default: m.LandingFinalCta,
    })),
  { ssr: false, loading: sectionFallback }
);

/** Client-only below-the-fold sections + auth redirect. Hero stays on the server. */
export function LandingBelowFold() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace('/feed');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (hasHydrated && isAuthenticated) {
    return null;
  }

  return (
    <>
      <LandingTrustedBy />
      <LandingProblem />
      <LandingSolution />
      <LandingWorkflow />
      <LandingFeatures />
      <LandingAiCapabilities />
      <LandingProductPreview />
      <LandingStats />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFaq />
      <LandingFinalCta />
    </>
  );
}
