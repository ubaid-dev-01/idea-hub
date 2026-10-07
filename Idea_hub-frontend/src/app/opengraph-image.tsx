import { ImageResponse } from 'next/og';

import { BrandOgLayout } from '@/components/brand/BrandOgLayout';

export const alt =
  'Idea Hub — Where serious ideas become accountable products';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(<BrandOgLayout />, { ...size });
}
