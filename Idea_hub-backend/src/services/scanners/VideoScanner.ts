import { createWriteStream } from 'node:fs';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import { nanoid } from 'nanoid';

import type { MediaScanResult } from './types.js';
import { ImageScanner } from './ImageScanner.js';
import { TextScanner } from './TextScanner.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const SPEECH_URL = 'https://speech.googleapis.com/v1/speech:recognize';

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

async function runFfmpeg(cmd: ReturnType<typeof ffmpeg>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    cmd.on('end', () => resolve());
    cmd.on('error', (err: Error) => reject(err));
    cmd.run();
  });
}

async function transcribeWav(wavPath: string): Promise<{
  transcript: string;
  mock: boolean;
}> {
  const key = process.env.GOOGLE_SPEECH_API_KEY;
  const buf = await readFile(wavPath);
  if (!key) {
    return {
      transcript:
        'Development mode transcript placeholder. No speech API key configured.',
      mock: true,
    };
  }
  const body = {
    config: {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: 16_000,
      languageCode: 'en-US',
    },
    audio: { content: buf.toString('base64') },
  };
  const res = await axios.post(`${SPEECH_URL}?key=${encodeURIComponent(key)}`, body, {
    timeout: 120_000,
  });
  const results = res.data?.results as
    | Array<{ alternatives?: Array<{ transcript?: string }> }>
    | undefined;
  const transcript =
    results
      ?.map((r) => r.alternatives?.[0]?.transcript ?? '')
      .join(' ')
      .trim() ?? '';
  return { transcript, mock: false };
}

export class VideoScanner {
  private readonly imageScanner = new ImageScanner();
  private readonly textScanner = new TextScanner();

  async scan(firebaseUrl: string, ideaId: string): Promise<MediaScanResult> {
    const jobId = nanoid();
    const base = path.join(tmpdir(), `scan_${ideaId}_${Date.now()}_${jobId}`);
    const videoPath = `${base}.mp4`;
    const framesDir = path.join(tmpdir(), `frames_${jobId}`);
    const wavPath = path.join(tmpdir(), `audio_${ideaId}_${jobId}.wav`);

    try {
      await mkdir(framesDir, { recursive: true });

      const res = await axios.get<NodeJS.ReadableStream>(firebaseUrl, {
        responseType: 'stream',
        timeout: 600_000,
        maxContentLength: Infinity,
        validateStatus: (s) => s >= 200 && s < 400,
      });
      await pipeline(res.data, createWriteStream(videoPath));

      await runFfmpeg(
        ffmpeg(videoPath)
          .outputOptions(['-vf', 'fps=1/5', '-vsync', '0'])
          .output(path.join(framesDir, '%04d.jpg'))
      );

      const frameFiles = (await readdir(framesDir))
        .filter((f) => f.toLowerCase().endsWith('.jpg'))
        .sort();

      const mediaResults: Awaited<ReturnType<ImageScanner['scanFromBuffer']>>[] =
        [];

      const batchSize = 5;
      for (let i = 0; i < frameFiles.length; i += batchSize) {
        const batch = frameFiles.slice(i, i + batchSize);
        const chunk = await Promise.all(
          batch.map(async (file, j) => {
            const idx = i + j + 1;
            const buf = await readFile(path.join(framesDir, file));
            return this.imageScanner.scanFromBuffer(buf, {
              frameIndex: idx,
              source: 'video_keyframe',
            });
          })
        );
        mediaResults.push(...chunk);
      }

      const flaggedFrames: number[] = [];
      for (const r of mediaResults) {
        const idx = r.details.frameIndex as number | undefined;
        if (
          typeof idx === 'number' &&
          (r.violations.length > 0 || r.score < 0.85)
        ) {
          flaggedFrames.push(idx);
        }
      }

      let frameScore =
        mediaResults.length > 0
          ? Math.min(...mediaResults.map((r) => r.score))
          : 1;

      await runFfmpeg(
        ffmpeg(videoPath)
          .outputOptions(['-t', '60', '-ac', '1', '-ar', '16000', '-f', 'wav'])
          .output(wavPath)
      );

      const { transcript, mock } = await transcribeWav(wavPath);
      const textScan = await this.textScanner.scan({ description: transcript });
      const audioViolations = [...textScan.violations];
      if (mock) {
        audioViolations.push('speech_transcription_mocked');
      }

      const combinedScore = Math.min(frameScore, textScan.score);

      const allViolations = [
        ...new Set([
          ...mediaResults.flatMap((r) => r.violations),
          ...audioViolations,
        ]),
      ];

      return {
        mediaType: 'video',
        score: clamp01(combinedScore),
        violations: allViolations,
        details: {
          frameCount: frameFiles.length,
          framesScanned: mediaResults.length,
          transcriptPreview: transcript.slice(0, 500),
          speechMocked: mock,
          audioTextScan: textScan.details,
        },
        flaggedFrames,
        audioViolations,
        scannedAt: new Date(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        mediaType: 'video',
        score: 0.2,
        violations: ['video_processing_failed'],
        details: { error: message },
        flaggedFrames: [],
        audioViolations: ['video_processing_failed'],
        scannedAt: new Date(),
      };
    } finally {
      await rm(videoPath, { force: true }).catch(() => undefined);
      await rm(framesDir, { recursive: true, force: true }).catch(() => undefined);
      await rm(wavPath, { force: true }).catch(() => undefined);
    }
  }
}
