/** Local Lottie assets — recolored to landing theme (ink / stone / teal #0F766E).
 *  Re-run `node scripts/recolor-lottie-theme.js` after replacing any JSON. */
export const LANDING_LOTTIE = {
  /** keywords: ideas, lightbulb, innovation, creative thinking */
  hero: '/lottie/hero-ideas.json',
  /** keywords: AI brain, neural network, machine learning */
  problem: '/lottie/ai-brain.json',
  /** keywords: workflow, process, steps */
  solution: '/lottie/workflow.json',
  /** keywords: team collaboration, remote work */
  workflow: '/lottie/collaboration.json',
  /** keywords: analytics, dashboard, charts */
  feedback: '/lottie/analytics.json',
  /** keywords: cloud sync, data */
  workspace: '/lottie/cloud.json',
  /** keywords: innovation, startup, rocket */
  matching: '/lottie/innovation.json',
  /** keywords: productivity, checklist */
  validation: '/lottie/productivity.json',
  /** keywords: automation, AI assistant */
  ai: '/lottie/automation.json',
  /** keywords: team, community */
  community: '/lottie/team.json',
} as const;

export type LandingLottieKey = keyof typeof LANDING_LOTTIE;
