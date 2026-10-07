import axios from 'axios';

import { logger } from '../lib/logger.js';

const log = logger.child({ module: 'groq-moderation' });

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Purpose-built safety model on Groq free tier (text + images). */
const DEFAULT_GUARD_MODEL = 'meta-llama/llama-guard-4-12b';

/** Max image bytes sent to Guard (base64 expands ~33%). */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const HAZARD_LABELS: Record<string, string> = {
  S1: 'violent crimes',
  S2: 'non-violent crimes',
  S3: 'sex-related crimes',
  S4: 'child exploitation',
  S5: 'defamation',
  S6: 'specialized advice',
  S7: 'privacy',
  S8: 'intellectual property',
  S9: 'indiscriminate weapons',
  S10: 'hate',
  S11: 'suicide / self-harm',
  S12: 'sexual content',
  S13: 'elections',
  S14: 'code interpreter abuse',
};

export class ContentBlockedError extends Error {
  readonly categories: string[];

  constructor(message: string, categories: string[] = []) {
    super(message);
    this.name = 'ContentBlockedError';
    this.categories = categories;
  }
}

export type ModerationVerdict = {
  allowed: boolean;
  skipped: boolean;
  raw: string;
  categories: string[];
  reason?: string;
};

function groqKey(): string | undefined {
  return process.env.GROQ_API_KEY?.trim() || undefined;
}

function guardModel(): string {
  return (
    process.env.GROQ_MODERATION_MODEL?.trim() || DEFAULT_GUARD_MODEL
  );
}

function parseGuardOutput(raw: string): {
  safe: boolean;
  categories: string[];
} {
  const text = raw.trim();
  const lower = text.toLowerCase();
  if (lower.startsWith('safe') && !lower.includes('unsafe')) {
    return { safe: true, categories: [] };
  }
  const cats: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^S(\d{1,2})$/i);
    if (m) cats.push(`S${m[1]}`);
  }
  return { safe: false, categories: [...new Set(cats)] };
}

function reasonFromCategories(categories: string[]): string {
  if (!categories.length) {
    return 'Content blocked by AI safety filter';
  }
  const labels = categories.map(
    (c) => HAZARD_LABELS[c.toUpperCase()] ?? c
  );
  return `Content blocked by AI filter: ${labels.join(', ')}`;
}

type ChatContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }
    >;

async function callGuard(messages: Array<{
  role: 'user' | 'assistant';
  content: ChatContent;
}>): Promise<ModerationVerdict> {
  const key = groqKey();
  if (!key) {
    return {
      allowed: true,
      skipped: true,
      raw: '',
      categories: [],
    };
  }

  try {
    const { data } = await axios.post<{
      choices?: Array<{ message?: { content?: string } }>;
    }>(
      GROQ_CHAT_URL,
      {
        model: guardModel(),
        temperature: 0,
        max_tokens: 64,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        timeout: 25_000,
      }
    );

    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!raw) {
      log.warn('empty Llama Guard response — allowing');
      return { allowed: true, skipped: true, raw: '', categories: [] };
    }

    const parsed = parseGuardOutput(raw);
    if (parsed.safe) {
      return {
        allowed: true,
        skipped: false,
        raw,
        categories: [],
      };
    }

    return {
      allowed: false,
      skipped: false,
      raw,
      categories: parsed.categories,
      reason: reasonFromCategories(parsed.categories),
    };
  } catch (e) {
    log.warn(
      { err: e instanceof Error ? e.message : e },
      'Groq moderation failed — allowing (async scan still applies)'
    );
    return {
      allowed: true,
      skipped: true,
      raw: '',
      categories: [],
    };
  }
}

/** Moderate plain text (idea title/description, captions, story text). */
export async function moderateText(
  text: string
): Promise<ModerationVerdict> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { allowed: true, skipped: true, raw: '', categories: [] };
  }
  // Keep under free-tier TPM; Guard only needs a short sample of long posts.
  const sample =
    trimmed.length > 6000 ? `${trimmed.slice(0, 6000)}\n…` : trimmed;
  return callGuard([{ role: 'user', content: sample }]);
}

/** Moderate an image buffer with Llama Guard 4 (multimodal). */
export async function moderateImageBuffer(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<ModerationVerdict> {
  if (!input.mimeType.startsWith('image/')) {
    return { allowed: true, skipped: true, raw: '', categories: [] };
  }
  if (input.buffer.length > MAX_IMAGE_BYTES) {
    log.info(
      { bytes: input.buffer.length },
      'image too large for sync Groq Guard — skip (async scan applies)'
    );
    return { allowed: true, skipped: true, raw: '', categories: [] };
  }

  const b64 = input.buffer.toString('base64');
  const dataUrl = `data:${input.mimeType};base64,${b64}`;

  return callGuard([
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Classify this uploaded image for community safety.',
        },
        { type: 'image_url', image_url: { url: dataUrl } },
      ],
    },
  ]);
}

/** Throw ContentBlockedError when text is unsafe. */
export async function assertTextAllowed(text: string): Promise<void> {
  const v = await moderateText(text);
  if (!v.allowed) {
    throw new ContentBlockedError(
      v.reason ?? 'Content blocked by AI safety filter',
      v.categories
    );
  }
}

/** Throw when image is unsafe (used before Cloudinary). */
export async function assertImageAllowed(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<void> {
  const v = await moderateImageBuffer(input);
  if (!v.allowed) {
    throw new ContentBlockedError(
      v.reason ?? 'Image blocked by AI safety filter',
      v.categories
    );
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(groqKey());
}
