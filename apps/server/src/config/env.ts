import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// One .env at the repo root; apps/server/.env (if present) takes precedence. Real env vars always win.
loadDotenv({ path: [path.resolve('.env'), path.resolve('../../.env')], quiet: true });

const bool = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0', 'yes', 'no'])
    .optional()
    .transform((v) => (v === undefined ? def : ['true', '1', 'yes'].includes(v)));

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

const optionalSecret = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

/** Accepts a 32-byte key as 64 hex chars or base64. */
const encryptionKey = z.string().transform((v, ctx) => {
  const s = v.trim();
  const buf = /^[0-9a-fA-F]{64}$/.test(s) ? Buffer.from(s, 'hex') : Buffer.from(s, 'base64');
  if (buf.length !== 32) {
    ctx.addIssue({
      code: 'custom',
      message: 'ENCRYPTION_KEY must be 32 bytes (64 hex chars or 44-char base64). Generate: openssl rand -hex 32',
    });
    return z.NEVER;
  }
  return buf;
});

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_URL: z.url().default('http://localhost:5173'),
    CORS_ORIGINS: csv,
    TRUST_PROXY: z.string().default('0'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    ENCRYPTION_KEY: encryptionKey,
    COOKIE_SECURE: z.enum(['auto', 'true', 'false']).default('auto'),

    ALLOW_REGISTRATION: bool(true),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(50).default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

    LLM_PROVIDER: z.enum(['openai', 'gemini', 'anthropic', 'none']).default('openai'),
    LLM_MODEL: optionalSecret,
    LLM_TIMEOUT_MS: z.coerce.number().int().min(2000).max(120000).default(30000),
    OPENAI_API_KEY: optionalSecret,
    OPENAI_BASE_URL: z.url().default('https://api.openai.com/v1'),
    GEMINI_API_KEY: optionalSecret,
    ANTHROPIC_API_KEY: optionalSecret,

    DEMO_MODE: bool(false),
    SEED_DEMO_DATA: bool(false),
    DEMO_RESET_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(0),

    /** Refresh exchange rates from a free, key-less API (falls back to the bundled table). */
    FX_LIVE_RATES: bool(true),
    FX_RATES_URL: z.url().default('https://open.er-api.com/v6/latest/USD'),

    SERVE_WEB: bool(true),
    WEB_DIST_PATH: z.string().optional(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    BODY_LIMIT: z.string().default('1mb'),
    RATE_LIMIT_DISABLED: bool(false),
  })
  .transform((e) => ({
    ...e,
    isProd: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
    cookieSecure: e.COOKIE_SECURE === 'auto' ? e.APP_URL.startsWith('https://') : e.COOKIE_SECURE === 'true',
    corsOrigins: e.CORS_ORIGINS.length ? e.CORS_ORIGINS : [new URL(e.APP_URL).origin],
    trustProxy: /^\d+$/.test(e.TRUST_PROXY) ? Number(e.TRUST_PROXY) : e.TRUST_PROXY,
  }));

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`);
    console.error(
      `\n❌ Invalid environment configuration:\n${lines.join('\n')}\n\nSee .env.example for documentation.\n`,
    );
    process.exit(1);
  }
  const env = parsed.data;
  if (env.isProd && env.JWT_ACCESS_SECRET.includes('change-me')) {
    console.error('❌ JWT_ACCESS_SECRET still uses the example value. Generate one: openssl rand -base64 48');
    process.exit(1);
  }
  return env;
}

export const env = load();
