import mongoose from 'mongoose';
import { z } from 'zod';

import { aiCoachEnabled } from '../config/ai-coach.config.js';
import {
  buildCoachChatSystemPrompt,
  buildDailyBriefSystemPrompt,
  buildIdeaFeedbackSystemPrompt,
  COACH_OFF_TOPIC_REPLY,
  looksOffTopicIdeaHub,
} from '../config/ai-coach-knowledge.js';
import { XP_REWARDS } from '../config/xp.config.js';
import {
  chatCompletionContent,
  coachLlmModel,
  llmApiKey,
} from '../lib/llm-client.js';
import {
  CollabRequest,
  CoachSession,
  Idea,
  Like,
  Notification,
  User,
} from '../models/index.js';
import type { IIdeaAiCoachFeedback } from '../models/Idea.model.js';
import { hasPaidProOrInvestor } from '../lib/subscription.js';
import type { IUserDocument, IUserSubscription } from '../models/User.model.js';
import {
  assertCoachChatUnderLimit,
  dismissCoachBrief,
  getCoachMessagesUsedToday,
  isCoachBriefDismissed,
  recordCoachMessageSent,
  utcDayString,
} from './coach-chat-limit.service.js';
import { coachFreeDailyMessageLimit } from '../config/ai-coach.config.js';

const IDEA_FEEDBACK_SCHEMA = z.object({
  overallFeedback: z.string().max(4000),
  strengths: z.array(z.string()).max(8),
  improvements: z
    .array(
      z.object({
        issue: z.string(),
        fix: z.string(),
        xpReward: z.number().min(0).max(5000),
      })
    )
    .max(8),
  marketInsight: z.string().max(2000),
  nextStep: z.string().max(2000),
});

const DAILY_BRIEF_SCHEMA = z.object({
  greeting: z.string().max(500),
  summaryLines: z.array(z.string()).max(12),
  todayChallengeTitle: z.string().max(200),
  todayChallengeDescription: z.string().max(1000),
  todayChallengeXp: z.number().min(1).max(500),
  trendingInsight: z.string().max(1000),
  motivationalMessage: z.string().max(500),
});

export type DailyBriefPayload = {
  greeting: string;
  summaryLines: string[];
  todayChallenge: {
    title: string;
    description: string;
    xpReward: number;
  };
  trendingInsight: string;
  motivationalMessage: string;
  briefDay: string;
  generatedAt: string;
};

function heuristicIdeaFeedback(idea: {
  title: string;
  description: string;
  category: string;
}): z.infer<typeof IDEA_FEEDBACK_SCHEMA> {
  return {
    overallFeedback: `Your idea "${idea.title.slice(0, 80)}" in ${idea.category} has a clear starting point. Tighten the problem statement and name one beachhead customer.`,
    strengths: [
      'You took the step to articulate the concept',
      'Category choice helps frame market conversations',
    ],
    improvements: [
      {
        issue: 'Value proposition could be sharper',
        fix: 'Write one sentence: who pays, why now, and what they get in week one.',
        xpReward: 50,
      },
      {
        issue: 'Evidence of demand',
        fix: 'Add 3 bullet points of user research or comparable products.',
        xpReward: 75,
      },
    ],
    marketInsight:
      'Investors and collaborators reward specificity over breadth in early-stage ideas.',
    nextStep: 'Post a short update with your riskiest assumption and how you will test it this week.',
  };
}

export async function generateIdeaFeedback(ideaId: string): Promise<void> {
  if (!aiCoachEnabled()) return;
  if (!mongoose.Types.ObjectId.isValid(ideaId)) return;
  const idea = await Idea.findById(ideaId);
  if (!idea || String(idea.status) === 'draft') return;

  const title = String(idea.title ?? '');
  const description = String(idea.description ?? '');
  const category = String(idea.category ?? 'other');
  const vs = idea.validationScore?.total;

  let parsed: z.infer<typeof IDEA_FEEDBACK_SCHEMA>;
  const key = llmApiKey();
  if (!key) {
    parsed = heuristicIdeaFeedback({ title, description, category });
  } else {
    const prompt = `Give concise, actionable Idea Hub publish feedback for this idea.
Title: ${title.slice(0, 200)}
Description: ${description.slice(0, 8000)}
Category: ${category}
Current validation score (0-100, may be missing): ${vs ?? 'not yet calculated'}

Return ONLY valid JSON (no markdown):
{
  "overallFeedback": "2-3 sentence summary",
  "strengths": ["...", "..."],
  "improvements": [
    { "issue": "short problem", "fix": "specific action", "xpReward": 50 }
  ],
  "marketInsight": "one key market observation",
  "nextStep": "single most important next action on Idea Hub"
}`;

    try {
      const raw = await chatCompletionContent({
        model: coachLlmModel(),
        temperature: 0.4,
        responseFormatJson: true,
        messages: [
          {
            role: 'system',
            content: buildIdeaFeedbackSystemPrompt(),
          },
          { role: 'user', content: prompt },
        ],
      });
      parsed = IDEA_FEEDBACK_SCHEMA.parse(JSON.parse(raw) as unknown);
    } catch (e) {
      console.warn('[AICoach] idea feedback LLM failed, heuristic:', e);
      parsed = heuristicIdeaFeedback({ title, description, category });
    }
  }

  const doc: IIdeaAiCoachFeedback = {
    overallFeedback: parsed.overallFeedback,
    strengths: parsed.strengths,
    improvements: parsed.improvements.map((i) => ({
      issue: i.issue.slice(0, 500),
      fix: i.fix.slice(0, 1000),
      xpReward: Math.min(500, Math.max(10, Math.round(i.xpReward))),
    })),
    marketInsight: parsed.marketInsight,
    nextStep: parsed.nextStep,
    generatedAt: new Date(),
  };

  await Idea.updateOne({ _id: idea._id }, { $set: { aiCoachFeedback: doc } });
}

export function scheduleIdeaCoachFeedback(ideaId: string): void {
  if (!aiCoachEnabled()) return;
  setImmediate(() => {
    void generateIdeaFeedback(ideaId).catch((err) =>
      console.warn('[AICoach] scheduleIdeaCoachFeedback', err)
    );
  });
}

function pickChallengeForUser(
  ideas: Array<{ title: string; media?: unknown[]; validationScore?: { total?: number } }>
): { title: string; description: string; xpReward: number } {
  const baseXp = 50;
  const best = [...ideas].sort(
    (a, b) =>
      (b.validationScore?.total ?? 0) - (a.validationScore?.total ?? 0)
  )[0];
  const low = [...ideas].sort(
    (a, b) =>
      (a.validationScore?.total ?? 100) - (b.validationScore?.total ?? 100)
  )[0];

  if (low && (low.validationScore?.total ?? 0) < 55 && low.title) {
    return {
      title: 'Boost a low-scoring idea',
      description: `Spend 15 minutes improving "${low.title.slice(0, 60)}": add a sharper problem statement and one metric you'll track.`,
      xpReward: baseXp + 25,
    };
  }
  const missingVideo = ideas.find((i) => !(i.media && i.media.length > 0));
  if (missingVideo && best) {
    return {
      title: 'Add media to your best idea',
      description: `Add a short video or image walkthrough to "${best.title.slice(0, 60)}" to increase engagement (+${XP_REWARDS.comment_posted} XP for comments when people engage).`,
      xpReward: baseXp,
    };
  }
  return {
    title: 'Talk to one user',
    description:
      'Reach out to one potential user today and note one insight in your idea description.',
    xpReward: baseXp,
  };
}

async function gatherBriefStats(userId: mongoose.Types.ObjectId): Promise<{
  lines: string[];
  topCategory: string;
  ideaTitles: string[];
}> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const ideas = await Idea.find({ authorId: userId, status: 'published' })
    .select('title likeCount commentCount validationScore category')
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        title: string;
        likeCount: number;
        commentCount: number;
        validationScore?: { total?: number };
        category: string;
      }>
    >();

  const lines: string[] = [];
  const ideaIds = ideas.map((i) => i._id);
  if (ideaIds.length === 0) {
    return { lines: ['You have no published ideas yet — publish one to unlock personalized updates!'], topCategory: 'tech', ideaTitles: [] };
  }

  for (const idea of ideas.slice(0, 5)) {
    const newLikes = await Like.countDocuments({
      ideaId: idea._id,
      createdAt: { $gte: since },
    });
    if (newLikes > 0) {
      lines.push(
        `Your "${idea.title.slice(0, 48)}${idea.title.length > 48 ? '…' : ''}" gained ${newLikes} new like(s) overnight.`
      );
    }
  }

  const pendingCollabs = await CollabRequest.countDocuments({
    ideaId: { $in: ideaIds },
    status: 'pending',
  });
  if (pendingCollabs > 0) {
    lines.push(
      `${pendingCollabs} collaboration request(s) waiting on your ideas — review them in Collaborations.`
    );
  }

  const scored = ideas.filter((i) => i.validationScore?.total != null);
  if (scored.length) {
    const top = [...scored].sort(
      (a, b) =>
        (b.validationScore?.total ?? 0) - (a.validationScore?.total ?? 0)
    )[0]!;
    lines.push(
      `Your strongest validation score is on "${top.title.slice(0, 40)}…" at ${top.validationScore?.total}/100.`
    );
  }

  const user = await User.findById(userId).select('interestProfile').lean();
  const weights = user?.interestProfile?.categoryWeights as
    | Record<string, number>
    | undefined;
  let topCategory = ideas[0]!.category;
  if (weights && Object.keys(weights).length) {
    topCategory = Object.entries(weights).sort((a, b) => b[1] - a[1])[0]![0];
  }

  return {
    lines,
    topCategory,
    ideaTitles: ideas.map((i) => i.title),
  };
}

async function trendingLine(category: string): Promise<string> {
  const hot = await Idea.findOne({
    status: 'published',
    visibility: 'public',
    category,
  })
    .sort({ trendingScore: -1, likeCount: -1 })
    .select('title trendingScore')
    .lean<{ title: string; trendingScore?: number } | null>();
  if (!hot) {
    return `Trending in ${category}: post consistently and engage others to climb the feed.`;
  }
  return `Trending in ${category}: "${hot.title.slice(0, 56)}${hot.title.length > 56 ? '…' : ''}" is picking up steam.`;
}

function heuristicDailyBrief(params: {
  user: IUserDocument;
  stats: { lines: string[]; topCategory: string; ideaTitles: string[] };
  challenge: { title: string; description: string; xpReward: number };
  trending: string;
  day: string;
}): DailyBriefPayload {
  const name = params.user.fullName?.trim() || params.user.username;
  const greeting = `Good morning ${name}! Here's your Ideas Hub brief.`;
  const summaryLines =
    params.stats.lines.length > 0
      ? params.stats.lines
      : [
          `You're working on ${params.stats.ideaTitles.length} published idea(s). Keep iterating!`,
        ];
  return {
    greeting,
    summaryLines,
    todayChallenge: params.challenge,
    trendingInsight: params.trending,
    motivationalMessage:
      'Small consistent improvements beat perfect plans. One focused action today moves the needle.',
    briefDay: params.day,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildDailyBrief(
  userId: string
): Promise<DailyBriefPayload | null> {
  if (!aiCoachEnabled()) return null;
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  const uid = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(uid);
  if (!user || user.status === 'banned') return null;

  const day = utcDayString();
  const cached = await getCachedBrief(userId, day);
  if (cached) return cached;

  const ideas = await Idea.find({ authorId: uid, status: 'published' })
    .select('title likeCount commentCount validationScore category media')
    .lean();
  const stats = await gatherBriefStats(uid);
  const challenge = pickChallengeForUser(ideas);
  const trending = await trendingLine(stats.topCategory);

  let payload: DailyBriefPayload;
  const key = llmApiKey();
  if (!key) {
    payload = heuristicDailyBrief({
      user,
      stats,
      challenge,
      trending,
      day,
    });
  } else {
    const statsBlock = [
      ...stats.lines,
      `Challenge candidate: ${challenge.title} — ${challenge.description}`,
      `Trending context: ${trending}`,
      `Idea titles: ${stats.ideaTitles.slice(0, 8).join('; ')}`,
    ].join('\n');

    const prompt = `You compose a short daily brief for an ideas platform user.
User first name context: ${user.fullName || user.username}
Stats and notes:
${statsBlock}

Return ONLY JSON:
{
  "greeting": "Good morning ...",
  "summaryLines": ["bullet style lines", "max 6"],
  "todayChallengeTitle": "short",
  "todayChallengeDescription": "one sentence",
  "todayChallengeXp": ${challenge.xpReward},
  "trendingInsight": "one line re trending in their category",
  "motivationalMessage": "one short encouraging line"
}`;

    try {
      const raw = await chatCompletionContent({
        model: coachLlmModel(),
        temperature: 0.45,
        responseFormatJson: true,
        messages: [
          { role: 'system', content: buildDailyBriefSystemPrompt() },
          { role: 'user', content: prompt },
        ],
      });
      const p = DAILY_BRIEF_SCHEMA.parse(JSON.parse(raw) as unknown);
      payload = {
        greeting: p.greeting,
        summaryLines: p.summaryLines,
        todayChallenge: {
          title: p.todayChallengeTitle,
          description: p.todayChallengeDescription,
          xpReward: Math.round(p.todayChallengeXp),
        },
        trendingInsight: p.trendingInsight,
        motivationalMessage: p.motivationalMessage,
        briefDay: day,
        generatedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn('[AICoach] daily brief LLM failed:', e);
      payload = heuristicDailyBrief({
        user,
        stats,
        challenge,
        trending,
        day,
      });
    }
  }

  await setCachedBrief(userId, day, payload);
  return payload;
}

async function getCachedBrief(
  userId: string,
  day: string
): Promise<DailyBriefPayload | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    const { getRedisClient } = await import('../config/redis.js');
    const redis = getRedisClient();
    if (!redis) return null;
    const raw = await redis.get(`coach:brief:json:${userId}:${day}`);
    if (!raw) return null;
    return JSON.parse(raw) as DailyBriefPayload;
  } catch {
    return null;
  }
}

async function setCachedBrief(
  userId: string,
  day: string,
  payload: DailyBriefPayload
): Promise<void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return;
  try {
    const { getRedisClient } = await import('../config/redis.js');
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(
      `coach:brief:json:${userId}:${day}`,
      JSON.stringify(payload),
      'EX',
      36 * 60 * 60
    );
  } catch {
    /* ignore */
  }
}

export async function deliverDailyBriefNotification(
  userId: string,
  brief: DailyBriefPayload
): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  const dup = await Notification.findOne({
    recipientId: uid,
    type: 'ai_coach_daily_brief',
    'metadata.briefDay': brief.briefDay,
  })
    .select('_id')
    .lean();
  if (dup) return;

  const bodyPreview =
    brief.summaryLines[0]?.slice(0, 400) ||
    brief.motivationalMessage.slice(0, 400);

  await Notification.create({
    recipientId: uid,
    senderId: null,
    type: 'ai_coach_daily_brief',
    referenceId: uid,
    referenceType: 'user',
    title: 'Your daily Ideas Hub brief',
    body: bodyPreview,
    isRead: false,
    isPushSent: false,
    metadata: {
      briefDay: brief.briefDay,
      greeting: brief.greeting,
    },
  });
}

export async function getDailyBriefForUser(userId: string): Promise<{
  brief: DailyBriefPayload | null;
  dismissed: boolean;
}> {
  if (!aiCoachEnabled()) {
    return { brief: null, dismissed: false };
  }
  const day = utcDayString();
  const dismissed = await isCoachBriefDismissed(userId, day);
  const brief = await buildDailyBrief(userId);
  return { brief, dismissed };
}

export async function dismissDailyBriefCard(userId: string): Promise<void> {
  await dismissCoachBrief(userId, utcDayString());
}

async function getOrCreateChatSession(
  userId: mongoose.Types.ObjectId,
  ideaId: mongoose.Types.ObjectId | null
): Promise<InstanceType<typeof CoachSession>> {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const existing = await CoachSession.findOne({
    userId,
    ideaId: ideaId ?? null,
    updatedAt: { $gte: sixHoursAgo },
    sessionType: 'market_research',
  }).sort({ updatedAt: -1 });

  if (existing) return existing;

  return CoachSession.create({
    userId,
    ideaId,
    messages: [],
    sessionType: 'market_research',
  });
}

export async function coachChat(params: {
  userId: string;
  message: string;
  ideaId?: string | null;
}): Promise<string> {
  if (!aiCoachEnabled()) {
    throw new Error('AI Coach is disabled');
  }
  const text = params.message.trim().slice(0, 8000);
  if (!text) throw new Error('Message required');

  const uid = new mongoose.Types.ObjectId(params.userId);
  const user = await User.findById(uid).select('fullName username').lean();
  if (!user) throw new Error('User not found');

  let ideaOid: mongoose.Types.ObjectId | null = null;
  if (params.ideaId && mongoose.Types.ObjectId.isValid(params.ideaId)) {
    ideaOid = new mongoose.Types.ObjectId(params.ideaId);
    const idea = await Idea.findOne({
      _id: ideaOid,
      authorId: uid,
    }).select('title description category validationScore');
    if (!idea) {
      ideaOid = null;
    }
  }

  const ideas = await Idea.find({ authorId: uid, status: 'published' })
    .select('title category validationScore.total')
    .limit(12)
    .lean();

  const session = await getOrCreateChatSession(uid, ideaOid);
  session.messages.push({ role: 'user', content: text, timestamp: new Date() });

  const portfolio = ideas
    .map(
      (i) =>
        `- ${i.title} (${i.category}) score:${i.validationScore?.total ?? '—'}`
    )
    .join('\n');

  let ideaCtx = '';
  if (ideaOid) {
    const idea = await Idea.findById(ideaOid)
      .select('title description category validationScore')
      .lean();
    if (idea) {
      ideaCtx = `\nFocused idea:\nTitle: ${idea.title}\nDescription: ${String(idea.description).slice(0, 4000)}`;
    }
  }

  const history = session.messages
    .slice(-20)
    .map(
      (m) =>
        `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content.slice(0, 4000)}`
    )
    .join('\n');

  const key = llmApiKey();
  let reply: string;
  if (!key) {
    reply =
      "I'm running in offline mode (no AI key). Ask about Idea Hub features — posting ideas, stories, pricing, marketplace — or add GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY for full coaching.";
  } else if (looksOffTopicIdeaHub(text)) {
    reply = COACH_OFF_TOPIC_REPLY;
  } else {
    const sys = buildCoachChatSystemPrompt({
      displayName: String(user.fullName || user.username),
      portfolioBlock: portfolio,
      ideaContext: ideaCtx,
    });
    try {
      reply = await chatCompletionContent({
        model: coachLlmModel(),
        temperature: 0.35,
        messages: [
          { role: 'system', content: sys },
          {
            role: 'user',
            content: `Conversation so far:\n${history}\n\nReply as Idea Hub AI Coach. If the latest user message is off-topic for Idea Hub, refuse and redirect — do not answer general knowledge questions.`,
          },
        ],
        timeoutMs: 75_000,
      });
    } catch (e) {
      console.warn('[AICoach] chat failed', e);
      reply =
        'I hit a temporary snag. Try again in a moment — ask about posting an idea, your validation score, or Idea Hub pricing.';
    }
  }

  session.messages.push({
    role: 'coach',
    content: reply.slice(0, 12_000),
    timestamp: new Date(),
  });
  await session.save();

  return reply;
}

export async function coachChatWithLimit(params: {
  userId: string;
  userRole: string;
  subscription?: IUserSubscription | null;
  message: string;
  ideaId?: string | null;
}): Promise<{ reply: string; messagesUsedToday: number; limit: number }> {
  const pre = await assertCoachChatUnderLimit({
    userId: params.userId,
    role: params.userRole,
    subscription: params.subscription,
  });
  if (!pre.ok) {
    throw new Error(
      `Daily coach message limit reached (${pre.used}/${pre.limit}). Upgrade to Pro for unlimited chat.`
    );
  }
  const reply = await coachChat({
    userId: params.userId,
    message: params.message,
    ideaId: params.ideaId,
  });
  await recordCoachMessageSent(
    params.userId,
    params.userRole,
    params.subscription
  );
  const used = await getCoachMessagesUsedToday(params.userId);
  const unlimited =
    params.userRole === 'moderator' ||
    params.userRole === 'super_admin' ||
    String(process.env.COACH_CHAT_UNLIMITED ?? '').toLowerCase() === 'true' ||
    hasPaidProOrInvestor({
      role: params.userRole,
      subscription: params.subscription,
    });
  const limit = unlimited ? -1 : coachFreeDailyMessageLimit();
  return { reply, messagesUsedToday: used, limit };
}
