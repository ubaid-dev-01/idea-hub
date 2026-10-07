import axios from 'axios';

const OPENAI_CHAT_BASE = 'https://api.openai.com/v1';
const GEMINI_OPENAI_COMPAT_BASE =
  'https://generativelanguage.googleapis.com/v1beta/openai';
const GROQ_OPENAI_COMPAT_BASE = 'https://api.groq.com/openai/v1';

/**
 * Provider priority when no VALIDATION_CHAT_BASE_URL override:
 * Groq (free) → Gemini → OpenAI.
 */
export function llmChatBaseUrl(): string {
  const explicit = process.env.VALIDATION_CHAT_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.GROQ_API_KEY?.trim()) {
    return GROQ_OPENAI_COMPAT_BASE;
  }
  if (process.env.GEMINI_API_KEY?.trim()) {
    return GEMINI_OPENAI_COMPAT_BASE;
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey?.startsWith('AIza')) {
    return GEMINI_OPENAI_COMPAT_BASE;
  }
  return OPENAI_CHAT_BASE;
}

export function llmApiKey(): string | undefined {
  return (
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    undefined
  );
}

/** Validation / metadata — fast free-tier Groq model by default. */
export function llmModel(): string {
  if (process.env.OPENAI_VALIDATION_MODEL?.trim()) {
    return process.env.OPENAI_VALIDATION_MODEL.trim();
  }
  if (process.env.GROQ_API_KEY?.trim()) {
    return 'llama-3.1-8b-instant';
  }
  return 'gpt-4o-mini';
}

/** Coach chat — stronger Groq model when available on free plan. */
export function coachLlmModel(): string {
  if (process.env.OPENAI_COACH_MODEL?.trim()) {
    return process.env.OPENAI_COACH_MODEL.trim();
  }
  if (process.env.GROQ_API_KEY?.trim()) {
    return 'llama-3.3-70b-versatile';
  }
  return llmModel();
}

export async function chatCompletionContent(params: {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  responseFormatJson?: boolean;
  model?: string;
  timeoutMs?: number;
}): Promise<string> {
  const key = llmApiKey();
  if (!key) {
    throw new Error('No LLM API key configured');
  }
  const url = `${llmChatBaseUrl()}/chat/completions`;
  const body: Record<string, unknown> = {
    model: params.model ?? llmModel(),
    temperature: params.temperature ?? 0.4,
    messages: params.messages,
  };
  if (params.responseFormatJson) {
    body.response_format = { type: 'json_object' };
  }
  const { data } = await axios.post<{
    choices?: Array<{ message?: { content?: string } }>;
  }>(url, body, {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    timeout: params.timeoutMs ?? 90_000,
  });
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error('Empty LLM response');
  return raw;
}
