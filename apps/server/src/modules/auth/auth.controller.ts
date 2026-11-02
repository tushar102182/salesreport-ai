import type { CookieOptions, Request, Response } from 'express';
import { changePasswordSchema, loginSchema, registerSchema, type AuthResponse } from '@salesreport/shared';
import { env } from '../../config/env';
import { validate } from '../../lib/validate';
import { getAuth } from '../../lib/http';
import { unauthorized } from '../../lib/errors';
import { ensureCsrfCookie } from '../../middleware/csrf';
import * as auth from './auth.service';
import { revokeByToken } from './token.service';

export const REFRESH_COOKIE = env.cookieSecure ? '__Secure-sr_rt' : 'sr_rt';
const REFRESH_PATH = '/api/auth';

const refreshCookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict',
  path: REFRESH_PATH,
  ...(expires ? { expires } : {}),
});

const meta = (req: Request) => ({ userAgent: req.get('user-agent'), ip: req.ip });

function sendSession(
  req: Request,
  res: Response,
  status: number,
  result: { user: AuthResponse['user']; accessToken: string; refresh: { token: string; expiresAt: Date } },
) {
  res.cookie(REFRESH_COOKIE, result.refresh.token, refreshCookieOptions(result.refresh.expiresAt));
  ensureCsrfCookie(req, res);
  res.setHeader('Cache-Control', 'no-store');
  const body: AuthResponse = {
    accessToken: result.accessToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    user: result.user,
  };
  res.status(status).json(body);
}

export async function register(req: Request, res: Response) {
  const input = validate(registerSchema, req.body);
  sendSession(req, res, 201, await auth.register(input, meta(req)));
}

export async function login(req: Request, res: Response) {
  const input = validate(loginSchema, req.body);
  sendSession(req, res, 200, await auth.login(input, meta(req)));
}

export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw unauthorized('No active session', 'NO_SESSION');
  try {
    sendSession(req, res, 200, await auth.refresh(token, meta(req)));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) await revokeByToken(token);
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.status(204).end();
}

export async function csrf(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ csrfToken: ensureCsrfCookie(req, res) });
}

export async function me(req: Request, res: Response) {
  res.json({ user: await auth.me(getAuth(req).id) });
}

export async function changePassword(req: Request, res: Response) {
  const input = validate(changePasswordSchema, req.body);
  sendSession(req, res, 200, await auth.changePassword(getAuth(req).id, input, meta(req)));
}
