export interface ScanResult {
  score: number;
  violations: string[];
  details: Record<string, unknown>;
  scannedAt: Date;
}

export interface MediaScanResult extends ScanResult {
  mediaType: 'image' | 'video' | 'pdf' | 'doc' | 'text';
  flaggedFrames?: number[];
  audioViolations?: string[];
  pageViolations?: Record<number, string[]>;
}

export interface AggregateScanResult {
  finalScore: number;
  allViolations: string[];
  report: {
    textResult?: ScanResult;
    mediaResults: MediaScanResult[];
    reviewRequired: boolean;
  };
  scannedAt: Date;
}

export type ScanDecision = 'approved' | 'pending_review' | 'rejected';

export function getDecision(score: number): ScanDecision {
  if (score >= 0.85) return 'approved';
  if (score >= 0.5) return 'pending_review';
  return 'rejected';
}
