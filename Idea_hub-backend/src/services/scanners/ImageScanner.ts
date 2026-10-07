import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import type { MediaScanResult } from './types.js';
import { TextScanner } from './TextScanner.js';

const VISION_URL = 'https://vision.googleapis.com/v1/images:annotate';

const IMAGE_MIME_ALLOWLIST = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

type Likelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY';

function likelihoodPenalty(level: Likelihood | undefined): number {
  if (!level || level === 'UNKNOWN') return 0;
  if (level === 'VERY_LIKELY' || level === 'LIKELY') return -0.5;
  if (level === 'POSSIBLE') return -0.2;
  return 0;
}

const PHISHING_HOST_SUBSTRINGS = [
  'login-secure',
  'verify-account',
  'banking-login',
  'wallet-connect',
  'eth-event',
  'claim-airdrop',
  'password-reset-now',
];

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"')]+/gi;

function extractUrls(text: string): string[] {
  const urls: string[] = [];
  let m: RegExpExecArray | null;
  URL_IN_TEXT_RE.lastIndex = 0;
  while ((m = URL_IN_TEXT_RE.exec(text)) !== null) {
    urls.push(m[0]);
  }
  return urls;
}

function isSuspiciousUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    return PHISHING_HOST_SUBSTRINGS.some((s) => host.includes(s));
  } catch {
    return false;
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export class ImageScanner {
  private readonly textScanner = new TextScanner();

  /**
   * Download image from URL (e.g. Firebase download URL) and scan.
   */
  async scan(firebaseUrl: string): Promise<MediaScanResult> {
    const res = await axios.get<ArrayBuffer>(firebaseUrl, {
      responseType: 'arraybuffer',
      timeout: 120_000,
      maxContentLength: 25 * 1024 * 1024,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const buffer = Buffer.from(res.data);
    return this.scanFromBuffer(buffer, { source: firebaseUrl });
  }

  /**
   * Scan an in-memory image (e.g. extracted video frames).
   */
  async scanFromBuffer(
    buffer: Buffer,
    meta: Record<string, unknown> = {}
  ): Promise<MediaScanResult> {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !IMAGE_MIME_ALLOWLIST.has(detected.mime)) {
      return {
        mediaType: 'image',
        score: 0.35,
        violations: ['image_magic_bytes_mismatch'],
        details: { ...meta, detectedMime: detected?.mime ?? null },
        scannedAt: new Date(),
      };
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      const ocrOnly = await this.runOcrHeuristic(buffer, meta);
      return {
        mediaType: 'image',
        score: ocrOnly.score,
        violations: ocrOnly.violations,
        details: {
          ...meta,
          visionSkipped: true,
          reason: 'GOOGLE_VISION_API_KEY not set',
          ...ocrOnly.details,
        },
        scannedAt: new Date(),
      };
    }

    const b64 = buffer.toString('base64');
    const body = {
      requests: [
        {
          image: { content: b64 },
          features: [
            { type: 'SAFE_SEARCH_DETECTION' as const, maxResults: 1 },
            { type: 'TEXT_DETECTION' as const, maxResults: 50 },
          ],
        },
      ],
    };

    const visionRes = await axios.post(
      `${VISION_URL}?key=${encodeURIComponent(apiKey)}`,
      body,
      { timeout: 60_000 }
    );

    const annotation = visionRes.data?.responses?.[0];
    const safe = annotation?.safeSearchAnnotation as
      | Record<string, Likelihood>
      | undefined;

    let score = 1;
    const violations: string[] = [];
    const safeDetails: Record<string, unknown> = {};

    if (safe) {
      const keys = ['adult', 'violence', 'racy', 'medical', 'spoof'] as const;
      for (const k of keys) {
        const level = safe[k];
        const p = likelihoodPenalty(level);
        safeDetails[k] = level;
        if (p < 0) {
          score += p;
          if (level === 'VERY_LIKELY' || level === 'LIKELY') {
            violations.push(`unsafe_image_${k}`);
          } else if (level === 'POSSIBLE') {
            violations.push(`possible_unsafe_image_${k}`);
          }
        }
      }
    }

    const texts = annotation?.textAnnotations as
      | Array<{ description?: string }>
      | undefined;
    const fullText = texts?.[0]?.description ?? '';
    const ocrDetails: Record<string, unknown> = {
      ocrCharCount: fullText.length,
    };

    if (fullText.trim().length > 0) {
      const textScan = await this.textScanner.scan({
        description: fullText,
      });
      score = Math.min(score, textScan.score);
      violations.push(...textScan.violations);
      ocrDetails.textScan = textScan.details;
    }

    const urls = extractUrls(fullText);
    const badUrls = urls.filter(isSuspiciousUrl);
    if (badUrls.length > 0) {
      score -= 0.35;
      violations.push('suspicious_url_in_image_text');
      ocrDetails.suspiciousUrls = badUrls.slice(0, 10);
    }

    const qrLike = /\bQR\b|scan\s+to\s+pay|wallet\s+address\s*:/i.test(
      fullText
    );
    if (qrLike && urls.length > 0) {
      ocrDetails.qrOrPaymentMention = true;
      if (badUrls.length === 0 && urls.some((u) => u.length > 80)) {
        score -= 0.15;
        violations.push('long_url_in_qr_context');
      }
    }

    return {
      mediaType: 'image',
      score: clamp01(score),
      violations: [...new Set(violations)],
      details: { ...meta, safeSearch: safeDetails, ocr: ocrDetails },
      scannedAt: new Date(),
    };
  }

  /**
   * When Vision is disabled, avoid false positives: light OCR-free heuristic only.
   */
  private async runOcrHeuristic(
    buffer: Buffer,
    meta: Record<string, unknown>
  ): Promise<{
    score: number;
    violations: string[];
    details: Record<string, unknown>;
  }> {
    void buffer;
    return {
      score: 1,
      violations: [],
      details: { ...meta, note: 'vision_api_disabled_dev_mode' },
    };
  }
}
