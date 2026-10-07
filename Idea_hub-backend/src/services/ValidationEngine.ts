import mongoose, { type Types } from 'mongoose';
import { z } from 'zod';

import { chatCompletionContent, llmApiKey, llmModel } from '../lib/llm-client.js';
import { CollabRequest, Idea, IdeaPollVote } from '../models/index.js';
import type {
  IIdea,
  IIdeaValidationScore,
  IdeaValidationTrend,
} from '../models/Idea.model.js';

const AI_RESPONSE_SCHEMA = z.object({
  marketScore: z.number().min(0).max(100),
  marketSize: z.enum(['small', 'medium', 'large', 'massive']),
  competition: z.enum(['low', 'medium', 'high']),
  feasibility: z.enum(['hard', 'medium', 'easy']),
  timing: z.enum(['too_early', 'perfect', 'too_late']),
  strengths: z.array(z.string()).max(12),
  risks: z.array(z.string()).max(12),
  suggestedPivots: z.array(z.string()).max(8),
});

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function isEngineEnabled(): boolean {
  return String(process.env.ENABLE_VALIDATION_ENGINE ?? '').toLowerCase() === 'true';
}

function expCurve(raw: number, scale: number): number {
  return Math.round(100 * (1 - Math.exp(-raw / scale)));
}

function scoreCommunity(
  likeCount: number,
  commentCount: number,
  pollVoteCount: number
): number {
  const raw =
    likeCount * 2.5 + commentCount * 3 + pollVoteCount * 4;
  return clamp(expCurve(raw, 35), 0, 100);
}

function scoreCollaboratorWant(
  collaboratorCount: number,
  pendingCollabRequests: number
): number {
  const raw = collaboratorCount * 12 + pendingCollabRequests * 10;
  return clamp(expCurve(raw, 10), 0, 100);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function titleOverlap(a: string, b: string): number {
  const A = titleTokens(a);
  const B = titleTokens(b);
  return jaccard(A, B);
}

function scoreCompleteness(idea: IIdea): number {
  const descLen = String(idea.description ?? '').trim().length;
  const descPts = clamp(Math.round((descLen / 400) * 45), 0, 45);
  const tagPts = clamp((idea.tags?.length ?? 0) * 5, 0, 20);
  const mediaPts = clamp((idea.media?.length ?? 0) * 8, 0, 20);
  let collabPts = 0;
  if (idea.collaboratorsOpen || (idea.requiredSkills?.length ?? 0) > 0) {
    collabPts = 15;
  }
  return clamp(descPts + tagPts + mediaPts + collabPts, 0, 100);
}

async function heuristicAiAnalysis(
  title: string,
  description: string
): Promise<z.infer<typeof AI_RESPONSE_SCHEMA>> {
  const text = `${title}\n${description}`.toLowerCase();
  const len = text.length;
  const marketScore = clamp(
    35 + Math.round(Math.min(40, len / 80)) + (text.includes('market') ? 8 : 0),
    0,
    100
  );
  const marketSize =
    len > 1200 ? 'large' : len > 500 ? 'medium' : 'small';
  const competition =
    /\b(many|crowded|competitors|saturated)\b/.test(text)
      ? 'high'
      : /\b(niche|unique|first)\b/.test(text)
        ? 'low'
        : 'medium';
  const feasibility =
    /\b(complex|years|research-heavy)\b/.test(text)
      ? 'hard'
      : /\b(mvp|simple|weekend)\b/.test(text)
        ? 'easy'
        : 'medium';
  const timing =
    /\b(future|2030|not ready)\b/.test(text)
      ? 'too_early'
      : /\b(outdated|late)\b/.test(text)
        ? 'too_late'
        : 'perfect';

  return {
    marketScore,
    marketSize,
    competition,
    feasibility,
    timing,
    strengths: [
      len > 200 ? 'Idea description has useful detail' : 'Clear starting point for iteration',
      'Structured feedback can raise investor readiness',
    ],
    risks: [
      competition === 'high'
        ? 'Competitive landscape may require sharp differentiation'
        : 'Validate demand with target users early',
    ],
    suggestedPivots: [
      'Add a sharper one-line value proposition at the top',
      'List 3 assumptions and how you would test each this week',
    ],
  };
}

async function analyzeWithAI(
  title: string,
  description: string
): Promise<z.infer<typeof AI_RESPONSE_SCHEMA>> {
  const key = llmApiKey();
  const model = llmModel();

  if (!key) {
    return heuristicAiAnalysis(title, description);
  }

  const prompt = `Analyze this startup/product idea for market potential.
Title: ${title.slice(0, 200)}
Description: ${description.slice(0, 8000)}

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "marketScore": <number 0-100>,
  "marketSize": "small"|"medium"|"large"|"massive",
  "competition": "low"|"medium"|"high",
  "feasibility": "hard"|"medium"|"easy",
  "timing": "too_early"|"perfect"|"too_late",
  "strengths": string[] max 6 short items,
  "risks": string[] max 6 short items,
  "suggestedPivots": string[] max 5 short actionable items
}`;

  try {
    const raw = await chatCompletionContent({
      model,
      temperature: 0.35,
      responseFormatJson: true,
      messages: [
        {
          role: 'system',
          content: 'You are a venture analyst. Reply with compact JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      timeoutMs: 60_000,
    });
    const parsed = JSON.parse(raw) as unknown;
    return AI_RESPONSE_SCHEMA.parse(parsed);
  } catch (err) {
    console.warn('[ValidationEngine] AI analysis failed, using heuristic:', err);
    return heuristicAiAnalysis(title, description);
  }
}

async function checkUniqueness(
  ideaId: Types.ObjectId,
  title: string,
  tags: string[]
): Promise<number> {
  const tagSet = new Set(tags.map((t) => String(t).toLowerCase()));
  if (tagSet.size === 0) {
    return 72;
  }

  const others = await Idea.find({
    _id: { $ne: ideaId },
    status: 'published',
    tags: { $in: [...tagSet] },
  })
    .select('title tags')
    .limit(120)
    .lean();

  if (others.length === 0) return 100;

  let maxSim = 0;
  for (const o of others) {
    const oTags = new Set((o.tags ?? []).map((t) => String(t).toLowerCase()));
    const tagSim = jaccard(tagSet, oTags);
    const titSim = titleOverlap(title, String(o.title ?? ''));
    const combined = 0.55 * tagSim + 0.45 * titSim;
    if (combined > maxSim) maxSim = combined;
  }

  return clamp(Math.round((1 - maxSim) * 100), 15, 100);
}

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 4500;

export function scheduleValidationRecalculate(
  ideaId: string,
  options?: { forceAi?: boolean }
): void {
  if (!isEngineEnabled()) return;
  if (!mongoose.Types.ObjectId.isValid(ideaId)) return;

  const prev = debounceTimers.get(ideaId);
  if (prev) clearTimeout(prev);

  debounceTimers.set(
    ideaId,
    setTimeout(() => {
      debounceTimers.delete(ideaId);
      void calculateScore(ideaId, options).catch((err) => {
        console.error('[ValidationEngine] calculateScore failed', ideaId, err);
      });
    }, DEBOUNCE_MS)
  );
}

export async function calculateScore(
  ideaId: string,
  options?: { forceAi?: boolean }
): Promise<IIdeaValidationScore | null> {
  if (!isEngineEnabled()) return null;
  if (!mongoose.Types.ObjectId.isValid(ideaId)) return null;

  const oid = new mongoose.Types.ObjectId(ideaId);
  const idea = await Idea.findById(oid).lean<IIdea | null>();
  if (!idea) return null;

  if (idea.status !== 'published') {
    return null;
  }

  const prevTotal = idea.validationScore?.total;
  const lastAi = idea.validationScore?.lastCalculated;

  const pendingCollabs = await CollabRequest.countDocuments({
    ideaId: oid,
    status: 'pending',
  });

  const pollVoteCount = await IdeaPollVote.countDocuments({ ideaId: oid });

  const communityVotes = scoreCommunity(
    idea.likeCount ?? 0,
    idea.commentCount ?? 0,
    pollVoteCount
  );
  const collaboratorWant = scoreCollaboratorWant(
    idea.collaborators?.length ?? 0,
    pendingCollabs
  );
  const uniquenessScore = await checkUniqueness(
    oid,
    idea.title,
    idea.tags ?? []
  );
  const completenessScore = scoreCompleteness(idea);

  const forceAi = Boolean(options?.forceAi);
  const dayMs = 24 * 60 * 60 * 1000;
  const needsFreshAi =
    forceAi ||
    !lastAi ||
    Date.now() - new Date(lastAi).getTime() > dayMs;

  let aiMarketScore: number;
  let breakdown: IIdeaValidationScore['breakdown'];
  let insights: {
    strengths: string[];
    risks: string[];
    suggestedPivots: string[];
  };

  if (!needsFreshAi && idea.validationScore) {
    const vs = idea.validationScore;
    aiMarketScore = vs.aiMarketScore ?? 50;
    breakdown = {
      marketSize: vs.breakdown?.marketSize ?? 'medium',
      competition: vs.breakdown?.competition ?? 'medium',
      feasibility: vs.breakdown?.feasibility ?? 'medium',
      timing: vs.breakdown?.timing ?? 'perfect',
    };
    insights = {
      strengths: vs.insights?.strengths ?? [],
      risks: vs.insights?.risks ?? [],
      suggestedPivots: vs.insights?.suggestedPivots ?? [],
    };
  } else {
    const ai = await analyzeWithAI(idea.title, idea.description);
    aiMarketScore = clamp(Math.round(ai.marketScore), 0, 100);
    breakdown = {
      marketSize: ai.marketSize,
      competition: ai.competition,
      feasibility: ai.feasibility,
      timing: ai.timing,
    };
    insights = {
      strengths: ai.strengths.slice(0, 8),
      risks: ai.risks.slice(0, 8),
      suggestedPivots: ai.suggestedPivots.slice(0, 6),
    };
  }

  const total = clamp(
    Math.round(
      communityVotes * 0.25 +
        collaboratorWant * 0.2 +
        aiMarketScore * 0.25 +
        uniquenessScore * 0.15 +
        completenessScore * 0.15
    ),
    0,
    100
  );

  let trend: IdeaValidationTrend = 'stable';
  if (typeof prevTotal === 'number' && !Number.isNaN(prevTotal)) {
    const d = total - prevTotal;
    if (d >= 2) trend = 'rising';
    else if (d <= -2) trend = 'falling';
  }

  const stored: IIdeaValidationScore = {
    total,
    communityVotes,
    collaboratorWant,
    aiMarketScore,
    uniquenessScore,
    completenessScore,
    lastCalculated: new Date(),
    trend,
    breakdown,
    insights,
  };

  await Idea.findByIdAndUpdate(oid, {
    $set: { validationScore: stored },
  });

  if (
    String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true' &&
    total >= 90
  ) {
    const { onIdeaQualityScore } = await import('./gamification.service.js');
    void onIdeaQualityScore(String(idea.authorId), total);
  }

  return stored;
}

export async function recalculateAllPublishedIdeas(options?: {
  forceAi?: boolean;
  batchSize?: number;
}): Promise<number> {
  if (!isEngineEnabled()) return 0;
  const batchSize = options?.batchSize ?? 25;
  const cursor = Idea.find({ status: 'published' }).select('_id').cursor();
  let n = 0;
  for await (const doc of cursor) {
    await calculateScore(String(doc._id), { forceAi: options?.forceAi });
    n += 1;
    if (n % batchSize === 0) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return n;
}
