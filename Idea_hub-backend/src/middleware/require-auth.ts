import type { NextFunction, Request, Response } from 'express';

import { verifyAccessToken } from '../lib/jwt.js';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const raw = req.headers.authorization;
  const m = typeof raw === 'string' ? raw.match(/^Bearer\s+(\S+)/i) : null;
  if (!m?.[1]) {
    res.status(401).json({
      success: false,
      message: 'Authorization required',
      data: null,
    });
    return;
  }
  try {
    const { sub } = verifyAccessToken(m[1]);
    res.locals.authUserId = sub;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      data: null,
    });
  }
}
