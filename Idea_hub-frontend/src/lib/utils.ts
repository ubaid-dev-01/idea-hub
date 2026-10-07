import { formatDistanceToNow as fnsFormatDistance, format } from 'date-fns';

export function formatDate(iso: string, pattern = 'PP'): string {
  try {
    return format(new Date(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    return fnsFormatDistance(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}
