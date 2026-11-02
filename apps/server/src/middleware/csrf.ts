import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { randomToken, safeEqual } from '../lib/crypto';
import { AppError } from '../lib/errors';

export const CSRF_COOKIE = env.cookieSecure ? '__Host-sr_csrf' : 'sr_csrf';
export const CSRF_HEADER = 'x-csrf-token';

/** Issues (or re-uses) the double-submit CSRF cookie and returns its value. */
export function ensureCsrfCookie(req: Request, res: Response): string {
  const existing = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const token = existing && /^[A-Za-z0-9_-]{32,64}$/.test(existing) ? existing : randomToken(32);
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by the SPA to echo it in the header
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
  return token;
}

/**
 * CSRF protection for endpoints authenticated by cookie (refresh / logout).
 * Layered defence: SameSite=Strict cookies + Origin allow-list + double-submit token.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && !env.corsOrigins.includes(origin) && origin !== `${req.protocol}://${req.get('host')}`) {
    throw new AppError(403, 'CSRF_ORIGIN', 'Cross-origin request blocked');
  }
  const cookie = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const header = req.get(CSRF_HEADER);
  if (!cookie || !header || !safeEqual(cookie, header)) {
    throw new AppError(403, 'CSRF_INVALID', 'Invalid or missing CSRF token');
  }
  next();
}
