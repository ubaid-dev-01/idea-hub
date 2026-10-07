'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Something went wrong
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {this.state.message ?? 'Please refresh the page or try again later.'}
          </p>
          <button
            type="button"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
            onClick={() => this.setState({ hasError: false, message: undefined })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
