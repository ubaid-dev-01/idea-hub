/**
 * Idea Hub owned landing assets (public/landing/*.png).
 * No third-party stock photography.
 */
const local = (name: string) => `/landing/${name}`;

export const LANDING_IMAGES = {
  heroTeam: local('landing-hero.png'),
  featureWhiteboard: local('landing-feature-collab.png'),
  featureAi: local('landing-feature-ai.png'),
  featureNetwork: local('landing-feature-network.png'),
  featureWorkspace: local('landing-feature-workspace.png'),
  stepPost: local('landing-step-post.png'),
  stepFeedback: local('landing-step-feedback.png'),
  stepLaunch: local('landing-step-launch.png'),
  trendGreen: local('landing-trend-green.png'),
  trendAi: local('landing-trend-ai.png'),
  trendCreator: local('landing-trend-creator.png'),
  gallery1: local('landing-gallery-1.png'),
  gallery2: local('landing-gallery-2.png'),
  gallery3: local('landing-gallery-3.png'),
  gallery4: local('landing-gallery-4.png'),
  gallery5: local('landing-gallery-5.png'),
  gallery6: local('landing-gallery-6.png'),
  /** Legal / company page heroes */
  legalHeroAbout: local('landing-legal-about.png'),
  legalHeroPrivacy: local('landing-legal-privacy.png'),
  legalHeroTerms: local('landing-legal-privacy.png'),
  legalHeroContact: local('landing-gallery-3.png'),
} as const;

/** Testimonial avatars — gradient initials (no stock portraits). */
export const TESTIMONIAL_AVATARS = {
  marcus: { initials: 'MC', from: '#4F46E5', to: '#7C3AED' },
  amara: { initials: 'AO', from: '#059669', to: '#0D9488' },
  james: { initials: 'JW', from: '#D97706', to: '#EA580C' },
  riley: { initials: 'RP', from: '#DB2777', to: '#7C3AED' },
} as const;

export const TEAM_AVATARS = {
  daniel: { initials: 'DO', from: '#4F46E5', to: '#6366F1' },
  sarah: { initials: 'SL', from: '#0D9488', to: '#14B8A6' },
  michael: { initials: 'MT', from: '#D97706', to: '#F59E0B' },
  yuki: { initials: 'YT', from: '#DB2777', to: '#A855F7' },
} as const;
