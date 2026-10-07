'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { LANDING_IMAGES } from '@/data/landing-media';
import { cn } from '@/components/ui/cn';

import { LandingImage } from './LandingImage';
import { LandingSection } from './LandingSection';

const shots = [
  { src: LANDING_IMAGES.gallery1, alt: 'Idea Hub community hackathon', caption: 'Annual build weekend · Berlin' },
  { src: LANDING_IMAGES.gallery2, alt: 'Founder summit keynote', caption: 'Founder summit · Singapore' },
  { src: LANDING_IMAGES.gallery3, alt: 'Community roundtable discussion', caption: 'Community roundtable · Austin' },
  { src: LANDING_IMAGES.gallery4, alt: 'Product launch celebration', caption: 'Launch retrospective · Toronto' },
  { src: LANDING_IMAGES.gallery5, alt: 'Release day livestream', caption: 'Release day livestream' },
  { src: LANDING_IMAGES.gallery6, alt: 'Remote-first coworking hub', caption: 'HQ coworking hours · Remote-first' },
] as const;

export function LandingGallery() {
  const reduce = useReducedMotion();

  return (
    <LandingSection
      tone="default"
      shell="none"
      ariaLabelledBy="gallery-heading"
      className="border-b border-slate-200/80 dark:border-slate-800"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <p className="landing-section-kicker">Events & culture</p>
        <h2
          id="gallery-heading"
          className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-4xl"
        >
          Community in motion
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
          Meetups, sprints, and launches from the Idea Hub ecosystem.
        </p>
      </motion.div>

      <ul className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        {shots.map((shot, i) => (
          <motion.li
            key={shot.caption}
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              'relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/50',
              i === 0 && 'lg:col-span-2 lg:aspect-[21/9]'
            )}
          >
            <LandingImage
              src={shot.src}
              alt={shot.alt}
              className="absolute inset-0 h-full w-full"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
            <p className="absolute bottom-0 left-0 right-0 p-3 text-[11px] font-semibold text-white/95 sm:text-xs">
              {shot.caption}
            </p>
          </motion.li>
        ))}
      </ul>
    </LandingSection>
  );
}
