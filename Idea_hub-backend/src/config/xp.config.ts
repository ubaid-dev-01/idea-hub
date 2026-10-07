/**
 * Gamification: XP rewards, level curve, titles, badges, weekly challenge templates.
 */

export const XP_REWARDS = {
  post_idea: 50,
  idea_gets_like: 5,
  idea_reaches_50_likes: 100,
  idea_reaches_100_likes: 250,
  collab_request_sent: 10,
  collab_accepted: 75,
  comment_posted: 5,
  daily_login: 10,
  streak_7_days: 100,
  streak_30_days: 500,
  validation_vote_given: 3,
  /** Published a duet / response building on someone else's idea */
  duet_published: 40,
  /** Original idea author credited when their idea receives a published duet */
  duet_original_credited: 25,
  idea_goes_trending: 200,
  first_idea: 150,
  weekly_challenge_complete: 500,
} as const;

export type XpRewardKey = keyof typeof XP_REWARDS;

/** Cumulative total XP required to *reach* each level (1-indexed: index 0 = level 1 at 0 XP). */
export const LEVEL_MIN_TOTAL_XP: number[] = (() => {
  const arr: number[] = [0];
  let acc = 0;
  for (let level = 2; level <= 50; level += 1) {
    const step = Math.floor(42 + level * 11 + level * level * 0.35);
    acc += step;
    arr.push(acc);
  }
  return arr;
})();

export function levelFromTotalXp(totalXp: number): {
  level: number;
  title: string;
  emoji: string;
  xpIntoLevel: number;
  xpToNext: number;
} {
  let level = 1;
  for (let L = 2; L <= 50; L += 1) {
    if (totalXp >= (LEVEL_MIN_TOTAL_XP[L - 1] ?? 0)) level = L;
    else break;
  }
  level = Math.min(50, Math.max(1, level));
  const title = LEVEL_TITLES[level] ?? LEVEL_TITLES[1]!;
  const emoji = levelEmojiFor(level);
  const floorXp = LEVEL_MIN_TOTAL_XP[level - 1] ?? 0;
  const nextFloor =
    level < 50 ? (LEVEL_MIN_TOTAL_XP[level] ?? floorXp) : floorXp;
  const xpIntoLevel = totalXp - floorXp;
  const xpToNext =
    level >= 50 ? 0 : Math.max(0, nextFloor - totalXp);
  return { level, title, emoji, xpIntoLevel, xpToNext };
}

const LEVEL_TITLES: Record<number, string> = {
  1: 'Idea Spark',
  2: 'Idea Spark',
  3: 'Idea Spark',
  4: 'Idea Spark',
  5: 'Idea Spark',
  6: 'Brainstormer',
  7: 'Brainstormer',
  8: 'Brainstormer',
  9: 'Brainstormer',
  10: 'Brainstormer',
  11: 'Innovator',
  12: 'Innovator',
  13: 'Innovator',
  14: 'Innovator',
  15: 'Innovator',
  16: 'Problem Solver',
  17: 'Problem Solver',
  18: 'Problem Solver',
  19: 'Problem Solver',
  20: 'Problem Solver',
  21: 'Visionary',
  22: 'Visionary',
  23: 'Visionary',
  24: 'Visionary',
  25: 'Visionary',
  26: 'Visionary',
  27: 'Visionary',
  28: 'Visionary',
  29: 'Visionary',
  30: 'Visionary',
  31: 'Industry Disruptor',
  32: 'Industry Disruptor',
  33: 'Industry Disruptor',
  34: 'Industry Disruptor',
  35: 'Industry Disruptor',
  36: 'Industry Disruptor',
  37: 'Industry Disruptor',
  38: 'Industry Disruptor',
  39: 'Industry Disruptor',
  40: 'Industry Disruptor',
  41: 'Legend',
  42: 'Legend',
  43: 'Legend',
  44: 'Legend',
  45: 'Legend',
  46: 'Legend',
  47: 'Legend',
  48: 'Legend',
  49: 'Legend',
  50: 'Hall of Fame',
};

export function levelEmojiFor(level: number): string {
  if (level >= 50) return '🏆';
  if (level >= 41) return '👑';
  if (level >= 31) return '🚀';
  if (level >= 21) return '🔭';
  if (level >= 16) return '🔧';
  if (level >= 11) return '⚡';
  if (level >= 6) return '💡';
  return '🌱';
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  rarity: BadgeRarity;
};

/** 30 badges — earn conditions evaluated in gamification.service */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_idea', name: 'First Idea', description: 'Post your first idea on Ideas Hub.', rarity: 'common' },
  { id: 'idea_machine_10', name: 'Idea Machine', description: 'Publish 10 ideas.', rarity: 'rare' },
  { id: 'prolific_50', name: 'Prolific Mind', description: 'Publish 50 ideas.', rarity: 'epic' },
  { id: 'generous_liker', name: 'Generous Heart', description: 'Give 100 likes to others’ ideas.', rarity: 'common' },
  { id: 'superfan_500', name: 'Superfan', description: 'Give 500 likes.', rarity: 'rare' },
  { id: 'voice_50', name: 'Voice of Community', description: 'Post 50 comments.', rarity: 'rare' },
  { id: 'discussion_leader', name: 'Discussion Leader', description: 'Post 200 comments.', rarity: 'epic' },
  { id: 'team_player', name: 'Team Player', description: 'Send your first collaboration request.', rarity: 'common' },
  { id: 'collaboration_king', name: 'Collaboration King', description: 'Have 10 collaborations accepted.', rarity: 'epic' },
  { id: 'streak_7', name: '7-Day Streak', description: 'Stay active 7 days in a row.', rarity: 'rare' },
  { id: 'streak_30', name: '30-Day Streak', description: 'Stay active 30 days in a row.', rarity: 'epic' },
  { id: 'streak_100', name: '100-Day Streak', description: 'Stay active 100 days in a row.', rarity: 'legendary' },
  { id: 'validation_expert', name: 'Validation Expert', description: 'Give 100 validation votes.', rarity: 'epic' },
  { id: 'trending_star', name: 'Trending Star', description: 'Have an idea go trending.', rarity: 'rare' },
  { id: 'trending_master', name: 'Trending Master', description: 'Have 5 ideas go trending.', rarity: 'legendary' },
  { id: 'idea_quality', name: 'Idea Quality', description: 'Reach 90+ viability score on an idea.', rarity: 'epic' },
  { id: 'top_weekly_contributor', name: 'Top Contributor', description: 'Finish in the weekly XP top 10.', rarity: 'legendary' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Joined during the platform’s first month.', rarity: 'legendary' },
  { id: 'rising_star_level', name: 'Rising Star', description: 'Reach level 10.', rarity: 'common' },
  { id: 'veteran_level', name: 'Veteran', description: 'Reach level 25.', rarity: 'rare' },
  { id: 'hall_of_fame_level', name: 'Max Level', description: 'Reach level 50.', rarity: 'legendary' },
  { id: 'challenge_seeker', name: 'Challenge Seeker', description: 'Complete your first weekly challenge.', rarity: 'common' },
  { id: 'challenge_master', name: 'Challenge Master', description: 'Complete 5 weekly challenges.', rarity: 'epic' },
  { id: 'xp_milestone_1k', name: 'XP Thousand', description: 'Earn 1,000 total XP.', rarity: 'common' },
  { id: 'xp_milestone_10k', name: 'XP Legend', description: 'Earn 10,000 total XP.', rarity: 'legendary' },
  { id: 'collector', name: 'Collector', description: 'Save 25 ideas.', rarity: 'rare' },
  { id: 'connector', name: 'Connector', description: 'Gain your first follower.', rarity: 'common' },
  { id: 'skilled_profile', name: 'Skilled', description: 'Add 5+ skills to your profile.', rarity: 'common' },
  { id: 'welcome_aboard', name: 'Welcome Aboard', description: 'Complete your first daily login streak bonus.', rarity: 'common' },
  { id: 'night_owl', name: 'Explorer', description: 'Use search 50 times (behavior tracked).', rarity: 'rare' },
];

export type ChallengeMetric =
  | 'ideas_posted'
  | 'comments_posted'
  | 'likes_given'
  | 'collabs_accepted'
  | 'validation_votes'
  | 'likes_received_on_ideas';

export type WeeklyChallengeTemplate = {
  id: string;
  title: string;
  description: string;
  metric: ChallengeMetric;
  target: number;
  /** Optional filter for idea category */
  category?: string;
};

export const WEEKLY_CHALLENGE_POOL: WeeklyChallengeTemplate[] = [
  { id: 'post_3_tech', title: 'Tech builder', description: 'Post 3 ideas in Tech this week.', metric: 'ideas_posted', target: 3, category: 'tech' },
  { id: 'post_2_health', title: 'Health advocate', description: 'Post 2 ideas in Health this week.', metric: 'ideas_posted', target: 2, category: 'health' },
  { id: 'collab_2', title: 'Team up', description: 'Get 2 collaboration requests accepted.', metric: 'collabs_accepted', target: 2 },
  { id: 'validate_10', title: 'Community voice', description: 'Give 10 validation votes.', metric: 'validation_votes', target: 10 },
  { id: 'likes_received_20', title: 'Crowd favorite', description: 'Get 20 new likes on your ideas this week.', metric: 'likes_received_on_ideas', target: 20 },
  { id: 'comment_15', title: 'Conversationalist', description: 'Post 15 comments on ideas.', metric: 'comments_posted', target: 15 },
  { id: 'like_25', title: 'Supporter', description: 'Like 25 ideas from others.', metric: 'likes_given', target: 25 },
  { id: 'post_3_any', title: 'Creator sprint', description: 'Publish 3 ideas in any category.', metric: 'ideas_posted', target: 3 },
];

export function pickWeeklyChallenge(seed: number): WeeklyChallengeTemplate {
  const i = Math.abs(seed) % WEEKLY_CHALLENGE_POOL.length;
  return WEEKLY_CHALLENGE_POOL[i]!;
}
