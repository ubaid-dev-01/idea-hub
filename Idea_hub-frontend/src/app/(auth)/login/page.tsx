'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

const inputClass =
  'h-12 rounded-full border-[var(--lh-line)] bg-[var(--lh-bg)] px-4 text-[var(--lh-ink)] placeholder:text-[var(--lh-muted)] focus:border-[var(--lh-ink)] focus:ring-[var(--lh-ink)]/15 dark:border-[var(--lh-line)] dark:bg-[var(--lh-surface)]';

export default function LoginPage() {
  const { login } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setApiError(null);
    try {
      await login(values.email, values.password);
    } catch {
      setApiError('Invalid email or password.');
    }
  });

  return (
    <AuthShell
      variant="login"
      footer={
        <>
          No account?{' '}
          <Link
            href="/register"
            className="font-medium text-[var(--lh-ink)] underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Create one
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit} noValidate>
        <AuthField label="Email" error={form.formState.errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
            {...form.register('email')}
          />
        </AuthField>

        <AuthField
          label="Password"
          error={form.formState.errors.password?.message}
          action={
            <button
              type="button"
              className="text-xs font-medium text-[var(--lh-muted)] transition-colors hover:text-[var(--lh-ink)]"
              onClick={() => setShowPw((s) => !s)}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          }
        >
          <Input
            type={showPw ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Your password"
            className={inputClass}
            {...form.register('password')}
          />
        </AuthField>

        {apiError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {apiError}
          </p>
        ) : null}

        <button
          type="submit"
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--lh-ink)] text-sm font-medium text-[var(--lh-bg)] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lh-ink)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Spinner size="sm" className="border-[var(--lh-bg)] border-t-transparent" />
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthShell>
  );
}
