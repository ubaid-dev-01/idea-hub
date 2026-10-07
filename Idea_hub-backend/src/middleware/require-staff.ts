import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

import { User } from '../models/index.js';

const STAFF_ROLES = new Set(['moderator', 'super_admin']);

/**
 * After `requireAuth`: ensures user is moderator or super_admin.
 */
export async function requireStaff(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = res.locals.authUserId as string | undefined;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401).json({
        success: false,
        message: 'Authorization required',
        data: null,
      });
      return;
    }
    const user = await User.findById(userId).select('role');
    if (!user || !STAFF_ROLES.has(user.role)) {
      res.status(403).json({
        success: false,
        message: 'Admin or moderator access required',
        data: null,
      });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
