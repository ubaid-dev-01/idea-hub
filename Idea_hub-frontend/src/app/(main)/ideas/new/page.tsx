'use client';

import { Suspense } from 'react';

import { AuthGuard } from '@/components/providers/AuthGuard';
import { UploadWizard } from '@/components/upload/UploadWizard';

export default function NewIdeaPage() {
  return (
    <AuthGuard>
      <div className="min-h-[calc(100dvh-8rem)] md:min-h-0">
        <h1 className="mb-6 px-4 text-xl font-semibold text-[var(--color-text-primary)] sm:mb-8 sm:px-0 sm:text-2xl md:text-3xl">
          New idea
        </h1>
        <div className="md:mx-auto md:max-w-lg md:rounded-card md:border md:border-[var(--color-border)] md:bg-[var(--color-surface)] md:p-6 md:shadow-card lg:max-w-xl dark:md:border-gray-700">
          <Suspense fallback={<p className="p-4 text-sm text-[var(--text-muted)]">Loading…</p>}>
            <UploadWizard />
          </Suspense>
        </div>
      </div>
    </AuthGuard>
  );
}
