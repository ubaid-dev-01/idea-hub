'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthField } from '@/components/auth/AuthField';
import { AuthShell } from '@/components/auth/AuthShell';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'At least 3 characters')
      .max(30)
      .regex(/^[a-z0-9][a-z0-9_-]*$/i, 'Letters, numbers, _ and - only'),
    fullName: z.string().min(1, 'Full name is required').max(120),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const inputClass =
  'h-12 rounded-full border-[var(--lh-line)] bg-[var(--lh-bg)] px-4 text-[var(--lh-ink)] placeholder:text-[var(--lh-muted)] focus:border-[var(--lh-ink)] focus:ring-[var(--lh-ink)]/15 dark:border-[var(--lh-line)] dark:bg-[var(--lh-surface)]';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setApiError(null);
    try {
      await registerUser({
        username: values.username.toLowerCase(),
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      });
    } catch (err) {
      const msg =
        isAxiosError(err) &&
        err.response?.data &&
        typeof (err.response.data as { message?: string }).message === 'string'
          ? (err.response.data as { message: string }).message
          : null;
      setApiError(
        msg ?? 'Registration failed. Try a different email or username.'
      );
    }
  });

  return (
    <AuthShell
      variant="register"
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--lh-ink)] underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <AuthField
          label="Username"
          error={form.formState.errors.username?.message}
        >
          <Input
            autoComplete="username"
            placeholder="yourname"
            className={inputClass}
            {...form.register('username')}
          />
        </AuthField>

        <AuthField
          label="Full name"
          error={form.formState.errors.fullName?.message}
        >
          <Input
            autoComplete="name"
            placeholder="Jane Doe"
            className={inputClass}
            {...form.register('fullName')}
          />
        </AuthField>

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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={inputClass}
            {...form.register('password')}
          />
        </AuthField>

        <AuthField
          label="Confirm password"
          error={form.formState.errors.confirmPassword?.message}
        >
          <Input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat password"
            className={inputClass}
            {...form.register('confirmPassword')}
          />
        </AuthField>

        {apiError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {apiError}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--lh-ink)] text-sm font-medium text-[var(--lh-bg)] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lh-ink)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Spinner size="sm" className="border-[var(--lh-bg)] border-t-transparent" />
          ) : (
            'Create account'
          )}
        </button>

        <p className="pt-1 text-center text-xs leading-relaxed text-[var(--lh-muted)]">
          By registering you agree to our{' '}
          <Link
            href="/terms"
            className="text-[var(--lh-ink)] underline underline-offset-2 hover:opacity-60"
          >
            Terms
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            className="text-[var(--lh-ink)] underline underline-offset-2 hover:opacity-60"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
}
