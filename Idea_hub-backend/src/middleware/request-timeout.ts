import type { NextFunction, Request, Response } from 'express';

const DEFAULT_MS = 30_000;

export function requestTimeout(ms = DEFAULT_MS) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const t = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          message: 'Request timeout',
          data: null,
          errors: [],
        });
      }
    }, ms);
    res.on('finish', () => clearTimeout(t));
    res.on('close', () => clearTimeout(t));
    next();
  };
}
