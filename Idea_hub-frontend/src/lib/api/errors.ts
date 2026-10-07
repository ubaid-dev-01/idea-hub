import { isAxiosError } from '@/lib/api/axios';

export function extractApiError(err: unknown): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; errors?: string[] }
      | undefined;
    if (data?.message) return data.message;
    if (data?.errors?.length) return data.errors.join(', ');
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
