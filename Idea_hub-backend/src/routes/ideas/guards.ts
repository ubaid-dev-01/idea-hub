import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

export function requireDb(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      success: false,
      message: 'Database unavailable',
      data: null,
    });
    return;
  }
  next();
}

export function publicFeedFilter(): Record<string, unknown> {
  return { status: 'published', visibility: 'public' };
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
