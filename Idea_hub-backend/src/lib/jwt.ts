import jwt from 'jsonwebtoken';

/** Longer access life reduces reload races; refresh still rotates every 7d. */
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES?.trim() || '7d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES?.trim() || '30d';

function secrets(): { access: string; refresh: string } {
  const access =
    process.env.JWT_ACCESS_SECRET?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'dev-ideahub-access-secret' : '');
  const refresh =
    process.env.JWT_REFRESH_SECRET?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'dev-ideahub-refresh-secret' : '');
  if (!access || !refresh) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production'
    );
  }
  return { access, refresh };
}

export function signAccessToken(userId: string): string {
  const { access } = secrets();
  const opts: jwt.SignOptions = {
    expiresIn: ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, kind: 'access' }, access, opts);
}

export function signRefreshToken(userId: string): string {
  const { refresh } = secrets();
  const opts: jwt.SignOptions = {
    expiresIn: REFRESH_EXPIRES as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, kind: 'refresh' }, refresh, opts);
}

export function verifyAccessToken(token: string): { sub: string } {
  const { access } = secrets();
  const payload = jwt.verify(token, access) as jwt.JwtPayload;
  if (payload.kind !== 'access' || typeof payload.sub !== 'string') {
    throw new Error('Invalid access token');
  }
  return { sub: payload.sub };
}

export function verifyRefreshToken(token: string): { sub: string } {
  const { refresh } = secrets();
  const payload = jwt.verify(token, refresh) as jwt.JwtPayload;
  if (payload.kind !== 'refresh' || typeof payload.sub !== 'string') {
    throw new Error('Invalid refresh token');
  }
  return { sub: payload.sub };
}

export function signTokenPair(userId: string): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}
