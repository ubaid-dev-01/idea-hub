import { createHash, randomBytes } from 'node:crypto';
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import mongoose from 'mongoose';

import { logger } from '../lib/logger.js';
import { signTokenPair, verifyRefreshToken } from '../lib/jwt.js';
import { getAuthLimiter } from '../middleware/rateLimiter.js';
import {
  denyRefreshToken,
  isRefreshTokenDenied,
} from '../services/token-denylist.service.js';
import { userToApi } from '../lib/serialize-user.js';
import { User } from '../models/index.js';

export const authRouter = Router();

function dbReady(_req: Request, res: Response, next: NextFunction): void {
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

function isDuplicateKey(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: number }).code === 11000
  );
}

function validationMessage(err: unknown): string {
  if (err instanceof mongoose.Error.ValidationError) {
    const first = Object.values(err.errors)[0];
    return first?.message ?? 'Validation failed';
  }
  return 'Registration failed';
}

authRouter.post('/register', getAuthLimiter(), dbReady, async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body as Record<
      string,
      unknown
    >;
    if (
      typeof username !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      typeof fullName !== 'string'
    ) {
      res.status(400).json({
        success: false,
        message: 'username, email, password, and fullName are required',
        data: null,
      });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
        data: null,
      });
      return;
    }

    const emailVerificationToken = randomBytes(32).toString('hex');

    const user = await User.create({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash: password,
      fullName: fullName.trim(),
      emailVerificationToken,
    });

    const tokens = signTokenPair(String(user._id));

    if (String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true') {
      const { recordDailyActivity } = await import(
        '../services/gamification.service.js'
      );
      void recordDailyActivity(String(user._id));
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.info(
        { verifyPath: `/api/auth/verify-email/${emailVerificationToken}` },
        '[dev] email verification URL'
      );
    }

    res.status(201).json({
      success: true,
      message: 'Account created',
      data: {
        user: userToApi(user),
        tokens,
      },
    });
  } catch (err) {
    if (isDuplicateKey(err)) {
      const key = (err as { keyPattern?: Record<string, number> }).keyPattern;
      const field = key ? Object.keys(key)[0] : 'field';
      res.status(409).json({
        success: false,
        message:
          field === 'email'
            ? 'That email is already registered'
            : field === 'username'
              ? 'That username is taken'
              : 'Email or username already in use',
        data: null,
      });
      return;
    }
    if (err instanceof mongoose.Error.ValidationError) {
      res.status(400).json({
        success: false,
        message: validationMessage(err),
        data: null,
      });
      return;
    }
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      data: null,
    });
  }
});

authRouter.post('/login', getAuthLimiter(), dbReady, async (req, res) => {
  try {
    const { email, password } = req.body as Record<string, unknown>;
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        message: 'email and password are required',
        data: null,
      });
      return;
    }

    const user = await User.findByEmail(email.trim());
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        data: null,
      });
      return;
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        data: null,
      });
      return;
    }

    const tokens = signTokenPair(String(user._id));

    if (String(process.env.ENABLE_GAMIFICATION ?? '').toLowerCase() === 'true') {
      const { recordDailyActivity } = await import(
        '../services/gamification.service.js'
      );
      void recordDailyActivity(String(user._id));
    }

    res.json({
      success: true,
      message: 'Logged in',
      data: {
        user: userToApi(user),
        tokens,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      data: null,
    });
  }
});

authRouter.post('/refresh', dbReady, async (req, res) => {
  try {
    const { refreshToken } = req.body as Record<string, unknown>;
    if (typeof refreshToken !== 'string' || !refreshToken) {
      res.status(400).json({
        success: false,
        message: 'refreshToken is required',
        data: null,
      });
      return;
    }

    if (await isRefreshTokenDenied(refreshToken)) {
      res.status(401).json({
        success: false,
        message: 'Refresh token revoked',
        data: null,
      });
      return;
    }

    const { sub } = verifyRefreshToken(refreshToken);
    const user = await User.findById(sub);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        data: null,
      });
      return;
    }

    await denyRefreshToken(refreshToken);
    const tokens = signTokenPair(String(user._id));
    res.json({
      success: true,
      message: 'OK',
      data: { tokens },
    });
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      data: null,
    });
  }
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body as Record<string, unknown>;
  if (typeof refreshToken === 'string' && refreshToken.length > 0) {
    await denyRefreshToken(refreshToken);
  }
  res.json({ success: true, message: 'OK', data: null });
});

async function verifyEmailHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const token = req.params.token;
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Token is required',
        data: null,
      });
      return;
    }

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
        data: null,
      });
      return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = '';
    if (user.status === 'pending_verification') {
      user.status = 'active';
    }
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      data: null,
    });
  }
}

authRouter.post('/verify-email/:token', dbReady, verifyEmailHandler);
authRouter.get('/verify-email/:token', dbReady, verifyEmailHandler);

authRouter.post('/forgot-password', getAuthLimiter(), dbReady, async (req, res) => {
  try {
    const raw = req.body as Record<string, unknown>;
    const email =
      typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'email is required',
        data: null,
      });
      return;
    }

    const user = await User.findOne({ email });
    if (user) {
      const resetToken = randomBytes(32).toString('hex');
      const hashed = createHash('sha256').update(resetToken).digest('hex');
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordResetToken: hashed,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
          },
        }
      );
      if (process.env.NODE_ENV !== 'production') {
        logger.info(
          {
            resetPath: `/api/auth/reset-password/${resetToken}`,
          },
          '[dev] password reset (use POST with { password } to complete)'
        );
      }
    }

    res.json({
      success: true,
      message:
        'If an account exists for that email, a reset link has been sent.',
      data: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Request failed',
      data: null,
    });
  }
});

authRouter.post(
  '/reset-password/:token',
  getAuthLimiter(),
  dbReady,
  async (req, res) => {
    try {
      const rawToken = req.params.token;
      const password = (req.body as Record<string, unknown>)?.password;
      if (typeof password !== 'string' || password.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters',
          data: null,
        });
        return;
      }

      const hashed = createHash('sha256').update(rawToken).digest('hex');
      const user = await User.findOne({
        passwordResetToken: hashed,
        passwordResetExpires: { $gt: new Date() },
      }).select('+passwordHash');

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Reset token invalid or expired',
          data: null,
        });
        return;
      }

      user.passwordHash = password;
      user.passwordResetToken = '';
      (user as { passwordResetExpires?: Date | null }).passwordResetExpires =
        null;
      await user.save();

      res.json({
        success: true,
        message: 'Password reset successfully',
        data: null,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        data: null,
      });
    }
  }
);
