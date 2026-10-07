import { createRequire } from 'node:module';

import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

import type { MediaScanResult } from './types.js';
import { TextScanner } from './TextScanner.js';

const require = createRequire(import.meta.url);

type PdfParseFn = (data: Buffer) => Promise<{ text: string; numpages: number }>;

const pdfParse: PdfParseFn = require('pdf-parse') as PdfParseFn;

const PDF_MAGIC = new Set(['application/pdf']);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function joinXlsxText(buffer: Buffer): { text: string; sheetNames: string[] } {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const parts: string[] = [];
  const sheetNames = workbook.SheetNames;
  for (const name of sheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const csv = XLSX.utils.sheet_to_csv(sheet);
    parts.push(csv);
  }
  return { text: parts.join('\n'), sheetNames };
}

export class DocumentScanner {
  private readonly textScanner = new TextScanner();

  async scan(firebaseUrl: string, mimeType: string): Promise<MediaScanResult> {
    const res = await axios.get<ArrayBuffer>(firebaseUrl, {
      responseType: 'arraybuffer',
      timeout: 300_000,
      maxContentLength: 60 * 1024 * 1024,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const buffer = Buffer.from(res.data);
    const detected = await fileTypeFromBuffer(buffer);
    const normalizedMime = mimeType.toLowerCase().trim();

    const baseDetails: Record<string, unknown> = {
      claimedMime: normalizedMime,
      detectedMime: detected?.mime ?? null,
    };

    if (normalizedMime.includes('pdf')) {
      if (detected && !PDF_MAGIC.has(detected.mime)) {
        return {
          mediaType: 'pdf',
          score: 0.35,
          violations: ['document_magic_bytes_mismatch'],
          details: { ...baseDetails, expected: 'pdf' },
          pageViolations: { 1: ['document_magic_bytes_mismatch'] },
          scannedAt: new Date(),
        };
      }
      const data = await pdfParse(buffer);
      const textScan = await this.textScanner.scan({
        description: data.text,
      });
      const pageViolations: Record<number, string[]> = {};
      if (textScan.violations.length > 0) {
        for (let p = 1; p <= Math.max(1, data.numpages); p += 1) {
          pageViolations[p] = [...textScan.violations];
        }
      }
      return {
        mediaType: 'pdf',
        score: clamp01(textScan.score),
        violations: textScan.violations,
        details: {
          ...baseDetails,
          pageCount: data.numpages,
          charCount: data.text.length,
          textScan: textScan.details,
        },
        pageViolations,
        scannedAt: new Date(),
      };
    }

    if (
      normalizedMime === DOCX_MIME ||
      normalizedMime.includes('wordprocessingml')
    ) {
      if (detected && detected.mime !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const dm = detected.mime as string;
        const zipOk =
          dm === 'application/zip' || dm === 'application/x-zip-compressed';
        if (!zipOk) {
          return {
            mediaType: 'doc',
            score: 0.35,
            violations: ['document_magic_bytes_mismatch'],
            details: { ...baseDetails, expected: 'docx' },
            scannedAt: new Date(),
          };
        }
      }
      const result = await mammoth.extractRawText({ buffer });
      const textScan = await this.textScanner.scan({
        description: result.value,
      });
      return {
        mediaType: 'doc',
        score: clamp01(textScan.score),
        violations: textScan.violations,
        details: {
          ...baseDetails,
          messages: result.messages,
          charCount: result.value.length,
          textScan: textScan.details,
        },
        scannedAt: new Date(),
      };
    }

    if (
      normalizedMime === XLSX_MIME ||
      normalizedMime.includes('spreadsheetml')
    ) {
      if (
        detected &&
        detected.mime !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ) {
        const dm = detected.mime as string;
        const zipOk =
          dm === 'application/zip' || dm === 'application/x-zip-compressed';
        if (!zipOk) {
          return {
            mediaType: 'doc',
            score: 0.35,
            violations: ['document_magic_bytes_mismatch'],
            details: { ...baseDetails, expected: 'xlsx' },
            scannedAt: new Date(),
          };
        }
      }
      const { text, sheetNames } = joinXlsxText(buffer);
      const textScan = await this.textScanner.scan({ description: text });
      return {
        mediaType: 'doc',
        score: clamp01(textScan.score),
        violations: textScan.violations,
        details: {
          ...baseDetails,
          format: 'xlsx',
          sheetNames,
          charCount: text.length,
          textScan: textScan.details,
        },
        scannedAt: new Date(),
      };
    }

    const fallback = await this.textScanner.scan({ description: '' });
    return {
      mediaType: 'text',
      score: clamp01(fallback.score),
      violations: ['unsupported_document_mime'],
      details: {
        ...baseDetails,
        note: 'No specific handler; scored empty transcript only',
      },
      scannedAt: new Date(),
    };
  }
}
