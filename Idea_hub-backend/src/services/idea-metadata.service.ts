import mongoose from 'mongoose';

import { chatCompletionContent, llmApiKey } from '../lib/llm-client.js';
import { Idea } from '../models/index.js';
import type { IdeaCategory } from '../models/Idea.model.js';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
  'are',
  'our',
  'can',
  'will',
  'into',
  'about',
  'have',
  'has',
  'been',
  'their',
  'they',
  'what',
  'when',
  'where',
  'how',
  'idea',
  'ideas',
]);

function heuristicSummary(input: {
  title: string;
  description: string;
  category: string;
}): string {
  const desc = input.description.replace(/\s+/g, ' ').trim();
  const snippet = desc.length > 220 ? `${desc.slice(0, 217)}…` : desc;
  return `${input.title.trim()} — a ${input.category} concept. ${snippet}`.slice(
    0,
    2000
  );
}

function heuristicSuggestedTags(input: {
  title: string;
  description: string;
  category: string;
  tags: string[];
}): string[] {
  const existing = new Set(
    (input.tags ?? []).map((t) => String(t).toLowerCase().trim())
  );
  existing.add(String(input.category).toLowerCase());

  const words = `${input.title} ${input.description}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const ranked = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  const out: string[] = [];
  for (const t of ranked) {
    if (existing.has(t)) continue;
    out.push(t);
    if (out.length >= 5) break;
  }
  return out;
}

async function llmMetadata(input: {
  title: string;
  description: string;
  category: string;
  tags: string[];
}): Promise<{ aiSummary: string; aiSuggestedTags: string[] } | null> {
  if (!llmApiKey()) return null;
  try {
    const raw = await chatCompletionContent({
      messages: [
        {
          role: 'system',
          content:
            'You generate concise idea metadata as JSON: {"aiSummary":"1-2 sentences max 400 chars","aiSuggestedTags":["tag1","tag2"]}. Tags: lowercase, no hashtags, max 5, do not repeat existing tags.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            title: input.title,
            description: input.description.slice(0, 3000),
            category: input.category,
            existingTags: input.tags,
          }),
        },
      ],
      responseFormatJson: true,
      temperature: 0.3,
      timeoutMs: 45_000,
    });
    const parsed = JSON.parse(raw) as {
      aiSummary?: string;
      aiSuggestedTags?: string[];
    };
    const aiSummary = String(parsed.aiSummary ?? '').trim().slice(0, 2000);
    const aiSuggestedTags = (parsed.aiSuggestedTags ?? [])
      .map((t) => String(t).toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 5);
    if (!aiSummary) return null;
    return { aiSummary, aiSuggestedTags };
  } catch {
    return null;
  }
}

export async function refreshIdeaMetadata(ideaId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(ideaId)) return;
  const idea = await Idea.findById(ideaId)
    .select('title description category tags')
    .lean<{
      title: string;
      description: string;
      category: IdeaCategory;
      tags: string[];
    } | null>();
  if (!idea) return;

  const llm = await llmMetadata({
    title: idea.title,
    description: idea.description,
    category: String(idea.category),
    tags: idea.tags ?? [],
  });

  const aiSummary =
    llm?.aiSummary ??
    heuristicSummary({
      title: idea.title,
      description: idea.description,
      category: String(idea.category),
    });
  const aiSuggestedTags =
    llm?.aiSuggestedTags ??
    heuristicSuggestedTags({
      title: idea.title,
      description: idea.description,
      category: String(idea.category),
      tags: idea.tags ?? [],
    });

  await Idea.updateOne(
    { _id: ideaId },
    { $set: { aiSummary, aiSuggestedTags } }
  );
}

export function scheduleIdeaMetadataRefresh(ideaId: string): void {
  setImmediate(() => {
    void refreshIdeaMetadata(ideaId).catch((err) => {
      console.warn('[idea-metadata] refresh failed', ideaId, err);
    });
  });
}
