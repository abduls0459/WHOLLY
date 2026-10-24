import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';

export const cookieName = 'wholly_refresh';
export const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000;

function accessKey() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(secret);
}

export function createAccessToken(userId) {
  return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(String(userId)).setIssuedAt().setExpirationTime('15m').sign(accessKey());
}

export function createRefreshToken() {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function setRefreshCookie(response, token) {
  response.cookie(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/api/v1/auth', maxAge: refreshLifetimeMs,
  });
}

export function clearRefreshCookie(response) {
  response.clearCookie(cookieName, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/api/v1/auth',
  });
}

export async function requireAccessToken(request, response, next) {
  const authorization = request.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  try {
    const { payload } = await jwtVerify(token, accessKey(), { algorithms: ['HS256'] });
    if (!payload.sub) throw new Error('Missing subject');
    request.userId = payload.sub;
    return next();
  } catch {
    return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  }
}
