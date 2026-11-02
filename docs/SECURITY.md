# Security overview

This document describes the security controls built into SalesReport AI and how to keep them effective.

## Authentication

- **Password hashing:** argon2id, `m=19 MiB, t=2, p=1` (OWASP 2024+ guidance) — `apps/server/src/modules/auth/password.ts`.
- **Password policy:** 10–128 characters with lowercase, uppercase, digit and symbol (`packages/shared/src/schemas/auth.ts`), enforced on server and client.
- **Access tokens:** HS256 JWT (via `jose`) with issuer/audience, 15-minute lifetime, kept **in memory only** in the browser. The user is reloaded from the DB on every request, so role changes, deletions and password changes take effect immediately (tokens issued before the last password change are rejected).
- **Refresh tokens:** 384-bit random values, stored as SHA-256 hashes, sent only as an `httpOnly; Secure; SameSite=Strict; Path=/api/auth` cookie (`__Secure-` prefix on https). Every refresh **rotates** the token; presenting an already-rotated token is treated as theft and **revokes the entire token family**. Logout and password changes revoke sessions. Expired tokens are pruned every 6 h.
- **Brute-force protection:** per-IP rate limit on login/register (10 failures / 15 min) plus per-account lockout after `LOGIN_MAX_ATTEMPTS` failures, doubling each time up to 24 h. Unknown e-mails run a dummy argon2 verification so timing does not reveal which accounts exist; error messages are generic.

## CSRF

API calls authenticate with the `Authorization` header (not cookies), so they are not CSRF-able. The two cookie-authenticated endpoints (`/auth/refresh`, `/auth/logout`) require:

1. `SameSite=Strict` cookies,
2. an `Origin` that matches the allow-list, and
3. a double-submit token: the `X-CSRF-Token` header must equal the `sr_csrf` cookie (`__Host-sr_csrf` on https), compared in constant time.

## Authorization & tenancy

- Roles: `admin` and `staff` (`requireRole` middleware). Staff cannot manage users, AI/company settings, or delete records. The last admin of an organization can't be demoted or deleted.
- Every tenant table carries `organizationId`; repositories always filter by it (`findFirst({ where: { id, organizationId } })`, `updateMany/deleteMany` with the org filter). Cross-references (invoice → customer/products) are verified to belong to the same organization. IDOR tests: `apps/server/test/invoices.test.ts`, `upload.test.ts`.

## Input handling

- zod validation for every body, query string and route parameter (`lib/validate.ts`), IDs restricted to `[A-Za-z0-9_-]`.
- JSON body limit (`BODY_LIMIT`, default 1 MB), URL-encoded 100 KB, multipart field/part limits.
- Prisma query builder only — no raw SQL with user input (the only raw query is the constant `SELECT 1` health check).
- React escapes all output; no `dangerouslySetInnerHTML`. AI output is rendered as text. PDFs are drawn as text, not HTML.
- Prompt-injection hygiene: only aggregated analytics are sent to the LLM, inside a delimited block, with an instruction to ignore embedded instructions; the response is parsed as JSON and validated with zod (length limits) before use.

## File uploads

- `multer` memory storage — files are parsed in memory and never written to disk.
- Size limits: 10 MB / 100,000 rows for sales files; 1 MB for logos. One file per request.
- Extension **and** MIME allow-list, then **magic-byte verification** (`.xlsx` must be a ZIP; CSV must be text without NUL bytes; logos must be real PNG/JPEG). SVG is intentionally not accepted.
- Header names are sanitized (control chars stripped, length-limited, `__proto__`/`constructor` renamed) and rows are built on null-prototype objects.
- Logos are served with `Content-Security-Policy: default-src 'none'; sandbox`.
- CSV exports neutralize spreadsheet formulas (cells starting with `= + - @ \t \r` are prefixed with `'`).

## Secrets

- Admin-supplied LLM API keys are encrypted with **AES-256-GCM** (random 96-bit IV, auth tag, organization ID as additional authenticated data) using `ENCRYPTION_KEY`. Keys are never returned to the browser — only a masked preview.
- `.env` is git-/docker-ignored; `.env.example` documents every variable. The server refuses to start in production with the example JWT secret.

## HTTP hardening

- `helmet` with a strict CSP: `default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'` (React/Recharts style attributes only); `object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. The theme bootstrap script is an external file so no inline script is needed. Fonts are self-hosted.
- HSTS and `upgrade-insecure-requests` when served over https; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` disabling camera/microphone/geolocation/payment; `X-Powered-By` removed; `Cache-Control: no-store` on API responses.
- CORS allow-list from `CORS_ORIGINS` with credentials.
- Rate limits on all API routes, stricter on auth, AI, uploads and PDF generation.

## Errors & logging

- Central error handler maps known errors to safe messages; unknown errors return a generic message with a request ID. Stack traces are never sent in production.
- `pino` structured JSON logs with request IDs; request logs contain only method, path and status. Authorization headers, cookies, passwords, tokens and API keys are redacted.

## Dependencies

- `npm audit` reports **0 vulnerabilities** at release (transitive `minimatch`, `deepmerge-ts` and `esbuild` are pinned to patched versions via `overrides` in the root `package.json`). SheetJS is installed from the official SheetJS CDN (the npm registry copy is outdated). The CI workflow runs `npm audit --omit=dev --audit-level=high`.

## Recommendations for operators

- Always terminate TLS (HTTPS) in front of the app and set `APP_URL` to the https URL.
- Restrict registration (`ALLOW_REGISTRATION=false`) for private deployments.
- Rotate `JWT_ACCESS_SECRET` to force everyone to sign in again; rotating `ENCRYPTION_KEY` requires re-entering stored AI keys.
- Set spending limits on your LLM provider account.
- Keep dependencies updated (`npm outdated`, `npm audit`).

## Reporting a vulnerability

_Placeholder for the seller/buyer: add a security contact e-mail here._
