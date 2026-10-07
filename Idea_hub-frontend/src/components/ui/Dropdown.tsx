'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/components/ui/cn';

export type DropdownMenuItem =
  | {
      key: string;
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      href: string;
    }
  | {
      key: string;
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      danger?: boolean;
      onSelect: () => void;
    };

type DropdownProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  align?: 'start' | 'end';
  className?: string;
  items: DropdownMenuItem[];
};

export function Dropdown({
  open,
  onClose,
  anchorRef,
  align = 'end',
  className,
  items,
}: DropdownProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | HTMLAnchorElement | null>>(
    []
  );
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const ar = anchor.getBoundingClientRect();
    const mr = menu.getBoundingClientRect();
    const gap = 8;
    let top = ar.bottom + gap;
    if (top + mr.height > window.innerHeight - 12) {
      top = ar.top - mr.height - gap;
    }
    top = Math.max(12, Math.min(top, window.innerHeight - mr.height - 12));
    let left =
      align === 'end' ? ar.right - mr.width : ar.left;
    left = Math.max(
      12,
      Math.min(left, window.innerWidth - mr.width - 12)
    );
    setCoords({ top, left });
  }, [align, anchorRef]);

  useLayoutEffect(() => {
    if (!open || !mounted) return;
    position();
    const onWin = () => position();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
    };
  }, [open, mounted, position, items.length]);

  useEffect(() => {
    if (open) setHighlight(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => (h + 1) % items.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => (h - 1 + items.length) % items.length);
      }
      if (e.key === 'Home') {
        e.preventDefault();
        setHighlight(0);
      }
      if (e.key === 'End') {
        e.preventDefault();
        setHighlight(items.length - 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, items.length, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = itemRefs.current[highlight];
    el?.focus();
  }, [highlight, open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const item = items[highlight];
      if (!item) return;
      if ('href' in item) {
        onClose();
        return;
      }
      item.onSelect();
      onClose();
    }
  };

  if (!mounted || !open) return null;

  const rowClass = (danger?: boolean, active?: boolean) =>
    cn(
      'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm outline-none transition-colors min-h-11',
      danger
        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30'
        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-border-light)] dark:hover:bg-gray-700',
      active && 'bg-[var(--color-border-light)] dark:bg-gray-700'
    );

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] cursor-default bg-transparent"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={menuRef}
        role="menu"
        tabIndex={-1}
        onKeyDown={onMenuKeyDown}
        className={cn(
          'fixed z-[100] w-56 origin-top overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-dropdown animate-scale-in dark:border-gray-700 dark:bg-gray-800',
          className
        )}
        style={{ top: coords.top, left: coords.left }}
      >
        {items.map((item, i) => {
          const active = i === highlight;
          const content = (
            <>
              {item.icon ? (
                <span className="shrink-0 text-[var(--color-text-secondary)]">
                  {item.icon}
                </span>
              ) : null}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.shortcut ? (
                <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-border-light)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-muted)] sm:inline dark:border-gray-600 dark:bg-gray-900">
                  {item.shortcut}
                </kbd>
              ) : null}
            </>
          );

          if ('href' in item) {
            return (
              <Link
                key={item.key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                className={rowClass(item.danger, active)}
                onClick={() => onClose()}
                onMouseEnter={() => setHighlight(i)}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={item.key}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={rowClass(item.danger, active)}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {content}
            </button>
          );
        })}
      </div>
    </>,
    document.body
  );
}
