import type { AggregateScanResult, MediaScanResult, ScanResult } from './types.js';

const TYPE_WEIGHTS: Record<string, number> = {
  text: 1.0,
  image: 1.5,
  video: 2.0,
  pdf: 1.0,
  doc: 1.0,
};

export class AggregateScanner {
  aggregate(
    textResult: ScanResult | null,
    mediaResults: MediaScanResult[]
  ): AggregateScanResult {
    let weightedSum = 0;
    let totalWeight = 0;

    if (textResult) {
      weightedSum += textResult.score * TYPE_WEIGHTS.text;
      totalWeight += TYPE_WEIGHTS.text;
    }

    for (const mr of mediaResults) {
      const w = TYPE_WEIGHTS[mr.mediaType] ?? 1.0;
      weightedSum += mr.score * w;
      totalWeight += w;
    }

    const finalScore = totalWeight > 0 ? weightedSum / totalWeight : 1.0;
    const allViolations = [
      ...(textResult?.violations ?? []),
      ...mediaResults.flatMap((r) => r.violations),
    ];
    const reviewRequired = finalScore >= 0.5 && finalScore < 0.85;

    return {
      finalScore,
      allViolations,
      report: {
        textResult: textResult ?? undefined,
        mediaResults,
        reviewRequired,
      },
      scannedAt: new Date(),
    };
  }
}
