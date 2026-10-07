import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — Idea Hub “Folio” mark. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          borderRadius: 36,
          position: 'relative',
        }}
      >
        {/* Back card */}
        <div
          style={{
            position: 'absolute',
            width: 72,
            height: 94,
            borderRadius: 14,
            background: '#0F766E',
            top: 32,
            left: 62,
          }}
        />
        {/* Front card */}
        <div
          style={{
            position: 'absolute',
            width: 72,
            height: 94,
            borderRadius: 14,
            background: '#FAFAF9',
            top: 48,
            left: 46,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 22,
            paddingLeft: 16,
            gap: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 8,
              borderRadius: 4,
              background: '#0A0A0A',
            }}
          />
          <div
            style={{
              width: 28,
              height: 8,
              borderRadius: 4,
              background: 'rgba(10,10,10,0.35)',
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
