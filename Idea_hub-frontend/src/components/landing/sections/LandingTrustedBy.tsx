'use client';

const LOGOS = [
  'Northwind Labs',
  'Meridian Ventures',
  'Cascade AI',
  'Forge Capital',
  'Signal Research',
  'Orbital Studio',
  'Helix Partners',
  'Brightline Ops',
];

export function LandingTrustedBy() {
  const row = [...LOGOS, ...LOGOS];

  return (
    <section
      className="border-y border-[var(--lh-line)] py-10 md:py-12"
      aria-label="Trusted by operators"
    >
      <div className="landing-container">
        <p className="landing-eyebrow text-center">Trusted by operators who ship</p>
      </div>
      <div className="relative mt-8 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--lh-bg)] to-transparent md:w-28"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--lh-bg)] to-transparent md:w-28"
        />
        <div className="landing-marquee-track gap-12 px-6 md:gap-16">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="landing-display shrink-0 text-lg font-semibold tracking-tight text-[var(--lh-ink)]/35 md:text-xl"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
