import { ImageResponse } from 'next/og';

import { BrandOgLayout } from '@/components/brand/BrandOgLayout';

export const alt = 'Idea Hub';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(<BrandOgLayout />, { ...size });
}
