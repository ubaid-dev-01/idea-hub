import type { ScanResult } from './types.js';
import { moderateText } from '../groq-moderation.service.js';

const HATE_PATTERNS: RegExp[] = [
  /\b(kill\s+(yourself|himself|herself|themself|everyone|all|people))\b/gi,
  /\b(die\s+(already|now|scum))\b/gi,
  /\b(i\s+will\s+(murder|kill|hurt|harm))\b/gi,
  /\b(genocide|ethnic\s+cleansing)\b/gi,
  /\b(holocaust\s+denial|gas\s+the)\b/gi,
];

const NSFW_KEYWORDS = new Set(
  [
    'porn',
    'pornography',
    'xxx',
    'nsfw',
    'nude',
    'nudes',
    'onlyfans',
    'sexual',
    'erotic',
    'hentai',
    'blowjob',
    'handjob',
    'orgasm',
  ].map((w) => w.toLowerCase())
);

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior)\s+(instructions|rules|guidelines)/gi,
  /\bsystem\s*:\s*/gi,
  /\byou\s+are\s+now\b/gi,
  /\bjailbreak\b/gi,
  /\bDAN\s+mode\b/gi,
  /disregard\s+(the\s+)?(above|prior)/gi,
];

const PII_PATTERNS: Record<string, RegExp> = {
  email: /[\w.+-]+@[\w.-]+\.\w{2,}/g,
  phone:
    /(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b/g,
  nationalIdUsSsn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
};

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export class TextScanner {
  async scan(input: {
    title?: string;
    description?: string;
    tags?: string[];
  }): Promise<ScanResult> {
    const parts = [
      input.title ?? '',
      input.description ?? '',
      ...(input.tags ?? []),
    ];
    const text = parts.join('\n').trim();
    const details: Record<string, unknown> = { charCount: text.length };

    if (!text) {
      return {
        score: 1,
        violations: [],
        details,
        scannedAt: new Date(),
      };
    }

    let score = 1;
    const violations: string[] = [];

    const hate = this.checkHateSpeech(text);
    score += hate.penalty;
    violations.push(...hate.violations);
    details.hateSpeech = hate.details;

    const spam = this.checkSpam(text);
    score += spam.penalty;
    violations.push(...spam.violations);
    details.spam = spam.details;

    const nsfw = this.checkNSFW(text);
    score += nsfw.penalty;
    violations.push(...nsfw.violations);
    details.nsfw = nsfw.details;

    const pii = this.checkPII(text);
    score += pii.penalty;
    violations.push(...pii.violations);
    details.pii = pii.details;

    const inj = this.checkPromptInjection(text);
    score += inj.penalty;
    violations.push(...inj.violations);
    details.promptInjection = inj.details;

    // Groq Llama Guard — second layer beyond keyword heuristics.
    const groq = await moderateText(text);
    details.groq = {
      skipped: groq.skipped,
      allowed: groq.allowed,
      categories: groq.categories,
      raw: groq.raw ? groq.raw.slice(0, 80) : '',
    };
    if (!groq.skipped && !groq.allowed) {
      score = Math.min(score, 0.25);
      for (const c of groq.categories) {
        violations.push(`groq_${c.toLowerCase()}`);
      }
      if (!groq.categories.length) violations.push('groq_unsafe');
    }

    return {
      score: clamp01(score),
      violations: [...new Set(violations)],
      details,
      scannedAt: new Date(),
    };
  }

  private checkHateSpeech(text: string): {
    penalty: number;
    violations: string[];
    details: Record<string, unknown>;
  } {
    const matches: string[] = [];
    for (const re of HATE_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        matches.push(m[0]);
      }
    }
    const unique = [...new Set(matches)];
    const penalty = unique.length > 0 ? -0.4 * unique.length : 0;
    return {
      penalty,
      violations: unique.length ? ['hate_speech'] : [],
      details: { matchCount: unique.length, samples: unique.slice(0, 5) },
    };
  }

  private checkSpam(text: string): {
    penalty: number;
    violations: string[];
    details: Record<string, unknown>;
  } {
    const violations: string[] = [];
    let penalty = 0;
    const details: Record<string, unknown> = {};

    if (/(.)\1{6,}/i.test(text)) {
      penalty -= 0.2;
      violations.push('spam_repetitive_chars');
      details.repetitiveChars = true;
    }

    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length >= 20) {
      const upper = letters.replace(/[^A-Z]/g, '').length;
      const ratio = upper / letters.length;
      if (ratio > 0.7) {
        penalty -= 0.2;
        violations.push('spam_excessive_caps');
        details.uppercaseRatio = ratio;
      }
    }

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length >= 5) {
      const lengths = words.map((w) => w.replace(/[^a-zA-Z0-9]/g, '').length);
      const avg =
        lengths.reduce((a, b) => a + b, 0) / Math.max(1, lengths.length);
      details.avgWordLength = avg;
      if (avg < 2 || avg > 20) {
        penalty -= 0.2;
        violations.push('spam_gibberish_word_length');
      }
    }

    return { penalty, violations, details };
  }

  private checkNSFW(text: string): {
    penalty: number;
    violations: string[];
    details: Record<string, unknown>;
  } {
    const lower = text.toLowerCase();
    const hits: string[] = [];
    for (const kw of NSFW_KEYWORDS) {
      const idx = lower.indexOf(kw);
      if (idx !== -1) hits.push(kw);
    }
    const penalty = hits.length > 0 ? -0.5 * hits.length : 0;
    return {
      penalty,
      violations: hits.length ? ['nsfw_language'] : [],
      details: { keywords: hits.slice(0, 10) },
    };
  }

  private checkPII(text: string): {
    penalty: number;
    violations: string[];
    details: Record<string, unknown>;
  } {
    const found: Record<string, number> = {};
    for (const [name, re] of Object.entries(PII_PATTERNS)) {
      re.lastIndex = 0;
      const ms = text.match(re);
      if (ms?.length) found[name] = ms.length;
    }
    const count = Object.values(found).reduce((a, b) => a + b, 0);
    const penalty = count > 0 ? -0.3 * Math.min(count, 5) : 0;
    return {
      penalty,
      violations: count > 0 ? ['pii_detected'] : [],
      details: { counts: found },
    };
  }

  private checkPromptInjection(text: string): {
    penalty: number;
    violations: string[];
    details: Record<string, unknown>;
  } {
    const matches: string[] = [];
    for (const re of PROMPT_INJECTION_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        matches.push(m[0]);
      }
    }
    const unique = [...new Set(matches)];
    const penalty = unique.length > 0 ? -0.6 * unique.length : 0;
    return {
      penalty,
      violations: unique.length ? ['prompt_injection'] : [],
      details: { matchCount: unique.length, samples: unique.slice(0, 5) },
    };
  }
}
