import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { randomToken, sha256 } from '../../lib/crypto';
import { unauthorized } from '../../lib/errors';
import { logger } from '../../lib/logger';

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = 'salesreport-ai';
const AUDIENCE = 'salesreport-web';

export interface AccessClaims {
  sub: string;
  org: string;
  role: 'admin' | 'staff';
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ org: claims.org, role: claims.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims & { iat: number }> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.org !== 'string') throw new Error('claims');
    return {
      sub: payload.sub,
      org: payload.org,
      role: payload.role === 'admin' ? 'admin' : 'staff',
      iat: payload.iat ?? 0,
    };
  } catch {
    throw unauthorized('Invalid or expired access token', 'TOKEN_INVALID');
  }
}

interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

/** Creates a refresh token. Only its SHA-256 hash is stored. */
export async function issueRefreshToken(userId: string, meta: ClientMeta, familyId?: string) {
  const token = randomToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  const row = await prisma.refreshToken.create({
    data: {
      userId,
      familyId: familyId ?? randomToken(16),
      tokenHash: sha256(token),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 300),
      ip: meta.ip?.slice(0, 64),
    },
  });
  return { token, expiresAt, id: row.id, familyId: row.familyId };
}

/**
 * Rotates a refresh token. If a token that was already rotated is presented again
 * (token reuse → likely theft), the whole token family is revoked.
 */
export async function rotateRefreshToken(presented: string, meta: ClientMeta) {
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(presented) } });
  if (!existing) throw unauthorized('Invalid session', 'REFRESH_INVALID');

  if (existing.revokedAt) {
    await revokeFamily(existing.familyId);
    logger.warn(
      { userId: existing.userId, familyId: existing.familyId },
      'refresh token reuse detected — family revoked',
    );
    throw unauthorized('Session expired, please sign in again', 'REFRESH_REUSED');
  }
  if (existing.expiresAt < new Date()) throw unauthorized('Session expired, please sign in again', 'REFRESH_EXPIRED');

  const next = await issueRefreshToken(existing.userId, meta, existing.familyId);
  const updated = await prisma.refreshToken.updateMany({
    where: { id: existing.id, revokedAt: null },
    data: { revokedAt: new Date(), replacedBy: next.id },
  });
  if (updated.count === 0) {
    // Lost a race with a concurrent rotation of the same token: treat as reuse.
    await revokeFamily(existing.familyId);
    throw unauthorized('Session expired, please sign in again', 'REFRESH_REUSED');
  }
  return { ...next, userId: existing.userId };
}

export async function revokeFamily(familyId: string) {
  await prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeByToken(presented: string) {
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(presented) } });
  if (existing) await revokeFamily(existing.familyId);
}

export async function revokeAllForUser(userId: string) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

/** Housekeeping: delete tokens that expired more than a day ago. */
export async function pruneExpiredTokens() {
  const { count } = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } },
  });
  return count;
}
