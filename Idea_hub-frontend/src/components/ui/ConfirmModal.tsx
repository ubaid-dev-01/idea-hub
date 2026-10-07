'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';

/**
 * Glass / neon-styled confirm dialog (replaces window.confirm).
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, loading]);

  if (!open || typeof document === 'undefined') return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch {
      /* caller handles toast */
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="alertdialog"
      aria-modal
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#030712]/75 backdrop-blur-md"
        aria-label="Close"
        disabled={loading}
        onClick={() => !loading && onClose()}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl animate-slide-up',
          'border-cyan-500/25 bg-[#0b111b]/95 shadow-[0_0_48px_rgba(0,242,255,0.12),0_25px_50px_-12px_rgba(0,0,0,0.5)]',
          'backdrop-blur-xl'
        )}
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden
        />

        <div className="relative p-6">
          <div className="flex gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
                variant === 'danger'
                  ? 'border-red-500/30 bg-red-500/10 text-red-300 shadow-[0_0_20px_rgba(248,113,113,0.15)]'
                  : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
              )}
            >
              <AlertTriangle className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="confirm-modal-title"
                className="text-lg font-semibold tracking-tight text-white"
              >
                {title}
              </h2>
              <div
                id="confirm-modal-desc"
                className="mt-2 text-sm leading-relaxed text-slate-400"
              >
                {children}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="md"
              disabled={loading}
              className="border border-cyan-500/15 text-slate-300 hover:border-cyan-500/25 hover:bg-cyan-500/5 hover:text-white"
              onClick={onClose}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              size="md"
              loading={loading}
              disabled={loading}
              className={cn(
                variant === 'danger'
                  ? 'border border-red-500/40 bg-red-600/90 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:bg-red-600'
                  : 'border-0 bg-gradient-to-r from-cyan-500 to-cyan-400 font-semibold text-[#070d16] shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:from-cyan-400 hover:to-cyan-300'
              )}
              onClick={() => void handleConfirm()}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
