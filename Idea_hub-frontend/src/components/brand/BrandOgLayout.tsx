import type { ReactNode } from 'react';

/** Shared OG / Twitter card — Idea Hub Folio branding. */
export function BrandOgLayout({
  title = 'Where serious ideas become accountable products.',
  subtitle = 'Share. Validate. Match. Launch — the operating system for founders, researchers, and operators.',
}: {
  title?: string;
  subtitle?: string;
}): ReactNode {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#FAFAF9',
        padding: '64px 72px',
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 85% 20%, rgba(15,118,110,0.1), transparent 55%)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            background: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 26,
              height: 34,
              borderRadius: 5,
              background: '#0F766E',
              top: 12,
              left: 22,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 26,
              height: 34,
              borderRadius: 5,
              background: '#FAFAF9',
              top: 18,
              left: 16,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: 8,
              paddingLeft: 5,
              gap: 4,
            }}
          >
            <div
              style={{
                width: 14,
                height: 3,
                borderRadius: 2,
                background: '#0A0A0A',
              }}
            />
            <div
              style={{
                width: 10,
                height: 3,
                borderRadius: 2,
                background: 'rgba(10,10,10,0.35)',
              }}
            />
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#0A0A0A',
          }}
        >
          Idea Hub
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          position: 'relative',
          maxWidth: 900,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-0.045em',
            lineHeight: 1.08,
            color: '#0A0A0A',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.45,
            color: '#737373',
            maxWidth: 720,
          }}
        >
          {subtitle}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 99,
            background: '#0F766E',
          }}
        />
        <div style={{ fontSize: 20, color: '#737373', letterSpacing: '0.02em' }}>
          ideahub.com
        </div>
      </div>
    </div>
  );
}
