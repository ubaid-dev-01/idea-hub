'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ICONS } from '@/lib/icons';
import { cn } from '@/components/ui/cn';

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  className,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    full: 'max-w-full min-h-[100dvh] rounded-none md:min-h-0 md:max-h-[90vh] md:rounded-card',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center md:items-center md:p-4"
      role="dialog"
      aria-modal
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] dark:bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-modal animate-slide-up dark:border-gray-700 md:max-h-[min(90vh,800px)] md:animate-scale-in',
          sizes[size],
          size !== 'full' && 'rounded-t-card md:rounded-card',
          className
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2
                id="modal-title"
                className="font-display truncate text-lg font-semibold text-[var(--color-text-primary)]"
              >
                {title}
              </h2>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-border-light)] dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <ICONS.clear size={20} strokeWidth={1.5} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3 dark:border-gray-700">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
