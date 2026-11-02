import type { Request } from 'express';
import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { env } from '../config/env';

const base: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.RATE_LIMIT_DISABLED,
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down and try again shortly.' },
    });
  },
};

/** Keyed by user when authenticated, otherwise by IP (IPv6-safe). */
const userOrIp = (req: Request) => (req.auth ? `u:${req.auth.id}` : `ip:${ipKeyGenerator(req.ip ?? '')}`);

export const apiLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 600 });

/** Login / register: 10 failed attempts per 15 min per IP. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const refreshLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 120 });

/** AI summary generation: costs money — 20/hour per user. */
export const aiLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 20, keyGenerator: userOrIp });

export const uploadLimiter = rateLimit({ ...base, windowMs: 60 * 60_000, limit: 60, keyGenerator: userOrIp });

export const pdfLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 60, keyGenerator: userOrIp });
