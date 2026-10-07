'use client';

import { Reveal } from '../motion/Reveal';

const QUOTES = [
  {
    quote:
      'We replaced three tools with Idea Hub for our pre-MVP narrative. The validation layer alone saved us a month of investor back-and-forth.',
    name: 'Amara Okonkwo',
    role: 'Founder, Cascade AI',
    initials: 'AO',
  },
  {
    quote:
      'Finally, a place where critique is structured. Our research team posts privately, then opens the thread when the hypothesis is ready.',
    name: 'Jonas Berg',
    role: 'Head of Research, Signal Lab',
    initials: 'JB',
  },
  {
    quote:
      'Matching by intent changed how we find co-builders. Less noise, more people who actually ship.',
    name: 'Priya Natarajan',
    role: 'Product lead, Meridian',
    initials: 'PN',
  },
];

export function LandingTestimonials() {
  return (
    <section
      id="community"
      className="landing-section"
      aria-labelledby="testimonials-heading"
    >
      <div className="landing-container">
        <Reveal>
          <p className="landing-eyebrow">Voices</p>
          <h2
            id="testimonials-heading"
            className="landing-display mt-5 max-w-[14ch] text-[clamp(2rem,4.5vw,3.5rem)] font-semibold"
          >
            Operators, not spectators.
          </h2>
        </Reveal>

        <div className="mt-16 space-y-0 divide-y divide-[var(--lh-line)] border-y border-[var(--lh-line)]">
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={i * 0.06}>
              <article className="grid gap-8 py-12 md:grid-cols-[1fr_12rem] md:gap-16 md:py-16">
                <blockquote className="landing-display text-[clamp(1.35rem,2.5vw,1.85rem)] font-medium leading-snug tracking-tight text-[var(--lh-ink)]">
                  “{q.quote}”
                </blockquote>
                <footer className="flex items-start gap-4 md:flex-col md:items-end md:text-right">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--lh-surface)] text-sm font-semibold text-[var(--lh-ink)]"
                    aria-hidden
                  >
                    {q.initials}
                  </div>
                  <div>
                    <cite className="not-italic text-sm font-semibold text-[var(--lh-ink)]">
                      {q.name}
                    </cite>
                    <p className="mt-0.5 text-sm text-[var(--lh-muted)]">{q.role}</p>
                  </div>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
