import type { ReactNode } from 'react';

type Props = {
  label: string;
  error?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function AuthField({ label, error, action, children }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-[13px] font-medium text-[var(--lh-ink)]">
          {label}
        </label>
        {action}
      </div>
      <div className="mt-2">{children}</div>
      {error ? (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
