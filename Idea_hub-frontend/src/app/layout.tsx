import type { Metadata } from 'next';
import { Geist, Syne } from 'next/font/google';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppToaster } from '@/components/providers/AppToaster';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'optional',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: { default: 'Idea Hub', template: '%s · Idea Hub' },
  description:
    'The operating system for serious ideation — share, validate, and launch ideas with founders, researchers, and operators.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000')
  ),
  applicationName: 'Idea Hub',
  icons: {
    icon: [
      { url: '/favicon.ico?v=folio1', sizes: 'any' },
      { url: '/favicon.svg?v=folio1', type: 'image/svg+xml' },
      { url: '/favicon-32.png?v=folio1', type: 'image/png', sizes: '32x32' },
      { url: '/icon.svg?v=folio1', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico?v=folio1',
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Idea Hub',
    title: 'Idea Hub',
    description:
      'Where serious ideas become accountable products. Feedback, validation, matching, and launch narratives in one place.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Idea Hub',
    description: 'Where serious ideas become accountable products.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${syne.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <QueryProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
            <AppToaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
