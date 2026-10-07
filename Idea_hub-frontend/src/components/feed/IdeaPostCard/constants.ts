import { Heart, HelpCircle, Lightbulb, Rocket, ThumbsUp } from 'lucide-react';

import type { IMedia } from '@/types/api';

export const REACTIONS = [
  { key: 'love', label: 'Love', Icon: Heart, className: 'text-red-500' },
  {
    key: 'insightful',
    label: 'Insightful',
    Icon: Lightbulb,
    className: 'text-amber-500',
  },
  {
    key: 'innovative',
    label: 'Innovative',
    Icon: Rocket,
    className: 'text-brand dark:text-indigo-400',
  },
  { key: 'support', label: 'Support', Icon: ThumbsUp, className: 'text-accent' },
  {
    key: 'interesting',
    label: 'Interesting',
    Icon: HelpCircle,
    className: 'text-slate-500 dark:text-slate-300',
  },
] as const;

export type ReactionKey = (typeof REACTIONS)[number]['key'];

export function timeAgoShort(iso: string): string {
  const t = Date.now() - new Date(iso).getTime();
  const s = Math.floor(t / 1000);
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

export function mediaUrl(m: IMedia): string {
  return m.cdnUrl || m.firebaseUrl || m.thumbnailUrl || '';
}

/** Tiny gray blur placeholder for next/image */
export const IMAGE_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
