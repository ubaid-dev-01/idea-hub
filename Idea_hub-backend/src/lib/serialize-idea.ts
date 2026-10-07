import type {
  IIdeaAiCoachFeedback,
  IIdeaDocument,
} from '../models/Idea.model.js';

function isoDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return '';
}

function refId(v: unknown): string {
  if (v && typeof v === 'object' && '_id' in v) {
    return String((v as { _id: unknown })._id);
  }
  return String(v ?? '');
}

function validationScoreToApi(
  raw: unknown
): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const v = raw as Record<string, unknown>;
  const breakdown = v.breakdown as Record<string, unknown> | undefined;
  const insights = v.insights as Record<string, unknown> | undefined;
  return {
    total: v.total,
    communityVotes: v.communityVotes,
    collaboratorWant: v.collaboratorWant,
    aiMarketScore: v.aiMarketScore,
    uniquenessScore: v.uniquenessScore,
    completenessScore: v.completenessScore,
    lastCalculated: isoDate(v.lastCalculated),
    trend: v.trend,
    breakdown: breakdown
      ? {
          marketSize: breakdown.marketSize,
          competition: breakdown.competition,
          feasibility: breakdown.feasibility,
          timing: breakdown.timing,
        }
      : undefined,
    insights: insights
      ? {
          strengths: Array.isArray(insights.strengths)
            ? insights.strengths
            : [],
          risks: Array.isArray(insights.risks) ? insights.risks : [],
          suggestedPivots: Array.isArray(insights.suggestedPivots)
            ? insights.suggestedPivots
            : [],
        }
      : undefined,
  };
}

export function aiCoachFeedbackToApi(
  f: IIdeaAiCoachFeedback
): Record<string, unknown> {
  return {
    overallFeedback: f.overallFeedback,
    strengths: f.strengths ?? [],
    improvements: (f.improvements ?? []).map((i) => ({
      issue: i.issue,
      fix: i.fix,
      xpReward: i.xpReward,
    })),
    marketInsight: f.marketInsight,
    nextStep: f.nextStep,
    generatedAt: isoDate(f.generatedAt),
  };
}

/** Attach coach feedback only when the viewer is the idea author. */
export function attachAiCoachForAuthor(
  idea: IIdeaDocument,
  payload: Record<string, unknown>,
  viewerUserId?: string | null
): void {
  if (!viewerUserId || viewerUserId !== String(idea.authorId)) return;
  const raw = idea.get('aiCoachFeedback') as IIdeaAiCoachFeedback | undefined;
  if (raw) {
    payload.aiCoachFeedback = aiCoachFeedbackToApi(raw);
  }
}

export function ideaToApi(idea: IIdeaDocument): Record<string, unknown> {
  const j = idea.toJSON({ virtuals: true }) as Record<string, unknown>;
  const media = Array.isArray(j.media) ? j.media : [];
  const collaborators = Array.isArray(j.collaborators) ? j.collaborators : [];
  const validationScore = validationScoreToApi(j.validationScore);

  const pollRaw = j.poll as Record<string, unknown> | undefined;
  const pollCounts = pollRaw?.counts as Record<string, unknown> | undefined;
  const pollOut =
    pollRaw && typeof pollRaw === 'object'
      ? {
          enabled: Boolean(pollRaw.enabled),
          question: String(pollRaw.question ?? ''),
          counts: {
            yes_definitely: Number(pollCounts?.yes_definitely ?? 0),
            maybe: Number(pollCounts?.maybe ?? 0),
            not_for_me: Number(pollCounts?.not_for_me ?? 0),
            already_exists: Number(pollCounts?.already_exists ?? 0),
          },
        }
      : {
          enabled: false,
          question: '',
          counts: {
            yes_definitely: 0,
            maybe: 0,
            not_for_me: 0,
            already_exists: 0,
          },
        };

  return {
    _id: String(j._id),
    authorId: refId(j.authorId),
    title: j.title,
    description: j.description,
    slug: j.slug,
    category: j.category,
    tags: j.tags ?? [],
    status: j.status,
    visibility: j.visibility,
    version: typeof j.version === 'number' ? j.version : 1,
    ...(j.parentIdeaId
      ? { parentIdeaId: refId(j.parentIdeaId) }
      : {}),
    isDuetResponse: Boolean(j.isDuetResponse),
    poll: pollOut,
    media: media.map((m: Record<string, unknown>) => ({
      _id: String(m._id),
      mediaType: m.mediaType,
      firebaseUrl: m.firebaseUrl ?? '',
      publicId: m.publicId ?? '',
      cdnUrl: m.cdnUrl ?? '',
      thumbnailUrl: m.thumbnailUrl ?? '',
      mimeType: m.mimeType ?? '',
      fileSizeBytes:
        typeof m.fileSizeBytes === 'number' ? m.fileSizeBytes : 0,
      durationSeconds:
        typeof m.durationSeconds === 'number' ? m.durationSeconds : 0,
      scanStatus: m.scanStatus ?? 'pending',
      scanViolations: m.scanViolations ?? [],
      ...(m.uploadedAt
        ? {
            uploadedAt:
              m.uploadedAt instanceof Date
                ? m.uploadedAt.toISOString()
                : String(m.uploadedAt),
          }
        : {}),
    })),
    collaboratorsOpen: j.collaboratorsOpen ?? false,
    requiredSkills: j.requiredSkills ?? [],
    collaborators: collaborators.map((c: Record<string, unknown>) => ({
      userId: refId(c.userId),
      role: c.role,
      joinedAt:
        c.joinedAt instanceof Date
          ? c.joinedAt.toISOString()
          : String(c.joinedAt ?? ''),
    })),
    likeCount: j.likeCount ?? 0,
    viewCount: j.viewCount ?? 0,
    shareCount: j.shareCount ?? 0,
    commentCount: j.commentCount ?? 0,
    trendingScore: j.trendingScore ?? 0,
    isFeatured: j.isFeatured ?? false,
    ...(j.featuredAt
      ? {
          featuredAt:
            j.featuredAt instanceof Date
              ? j.featuredAt.toISOString()
              : String(j.featuredAt),
        }
      : {}),
    contentScanScore: j.contentScanScore ?? 0,
    location: String(j.location ?? ''),
    aiSummary: String(j.aiSummary ?? ''),
    aiSuggestedTags: Array.isArray(j.aiSuggestedTags)
      ? j.aiSuggestedTags
      : [],
    ...(validationScore ? { validationScore } : {}),
    ...(j.rejectionReason
      ? { rejectionReason: j.rejectionReason }
      : {}),
    createdAt:
      j.createdAt instanceof Date
        ? j.createdAt.toISOString()
        : String(j.createdAt ?? ''),
    updatedAt:
      j.updatedAt instanceof Date
        ? j.updatedAt.toISOString()
        : String(j.updatedAt ?? ''),
  };
}
