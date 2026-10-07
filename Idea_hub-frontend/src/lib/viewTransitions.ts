import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

type ViewTransitionDocument = Document & {
  // Spec: https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition
  startViewTransition?: (cb: () => void) => unknown;
};

export function pushWithViewTransition(
  router: AppRouterInstance,
  href: string
): void {
  if (typeof document === 'undefined') {
    router.push(href);
    return;
  }
  const d = document as ViewTransitionDocument;
  if (typeof d.startViewTransition === 'function') {
    d.startViewTransition(() => router.push(href));
  } else {
    router.push(href);
  }
}

