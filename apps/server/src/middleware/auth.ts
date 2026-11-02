import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyAccessToken } from '../modules/auth/token.service';

/**
 * Verifies the Bearer access token and loads the user fresh from the database,
 * so deleted users, role changes and password changes take effect immediately.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw unauthorized();
  const claims = await verifyAccessToken(header.slice(7).trim());

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, organizationId: true, passwordChangedAt: true },
  });
  if (!user || user.organizationId !== claims.org) throw unauthorized('Invalid session', 'TOKEN_INVALID');
  // Tokens issued before the last password change are rejected.
  if (claims.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw unauthorized('Session expired, please sign in again', 'TOKEN_INVALID');
  }
  req.auth = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role === 'admin' ? 'admin' : 'staff',
    organizationId: user.organizationId,
  };
  next();
}

/** Role-based access control. Must run after `requireAuth`. */
export const requireRole =
  (...roles: ('admin' | 'staff')[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized();
    if (!roles.includes(req.auth.role)) throw forbidden();
    next();
  };
