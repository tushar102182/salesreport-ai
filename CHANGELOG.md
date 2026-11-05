# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## 1.1.1 - 2026-11-06

### Fixed

- **Display currency did not change amounts.** Root cause: every amount was formatted with the currency stored on its own record (a dataset's upload currency, an invoice's currency), and the only currency setting was the company default, which only applies to _new_ uploads and invoices. So switching to USD changed nothing on existing data, and the dashboard invoice totals added mixed-currency invoices together under the company symbol. Now every amount is converted from its source currency to one global display currency.
- Dashboard invoice totals are summed per currency and converted, never added unconverted.

### Added

- **Language and currency switchers in the top bar** on every signed-in page (compact on mobile), kept in sync with a new _Display preferences_ card in Settings → My account. The display currency persists in `localStorage` and on the user account (`User.displayCurrency`, `PATCH /api/auth/me/preferences`; not saved server-side on the shared public demo).
- Global display currency: `CurrencyProvider` + `useFormat().money(amount, sourceCurrency)` converts and formats every amount (dashboard KPIs, charts, axes, tooltips, tables, datasets, invoices, products, AI summary). The web app sends `X-Display-Currency` on every request.
- Server endpoints accept `?currency=` / `X-Display-Currency`: `/api/dashboard`, `/api/datasets/:id/analytics`, `/api/datasets/:id/summary` (summaries are cached per language and currency), `/api/datasets/:id/report.pdf` and `/api/invoices/:id/pdf`. Converted PDFs show the original currency and the exchange rate used.
- Exchange rates: a bundled table with base USD (`packages/shared/src/fx.ts`), refreshed every 12 hours from a free, key-less API (`FX_RATES_URL`, default open.er-api.com) when reachable, with fallback to the bundled table. `GET /api/config/fx`. Rates are labelled approximate.
- 8 more UI languages: German, Italian, Turkish, Indonesian, Russian, Chinese (Simplified), Japanese and Urdu (RTL), for **15 in total**. All locale files have exactly the keys of `en.json`, enforced by a test.
- 16 more currencies (60 in total): RUB, UAH, ILS, CZK, HUF, RON, TWD, PEN, ETB, TZS, UGX, MMK, KHR, JOD, DZD, KZT.
- Tests for conversion, formatting, display-currency endpoints, preferences and locale completeness (70 tests).
- Migration `20261106000000_display_currency` (mirrored in `database/migrations/0002_display_currency.sql` and `Node Express API/prisma/migrations/`).
- `/api/health` and `/api/config` report the app version.

## 1.1.0 - 2026-11-04

### Added

- Premium landing page at `/welcome` (hero, features, screenshots, benefits, steps) with a **Live Demo** button; anonymous visitors to `/` land here.
- UI in 7 languages: English, Bangla, Spanish, French, Arabic (right-to-left), Hindi and Portuguese, via a language dropdown.
- 44 currencies (was 11), incl. JPY/KWD/BHD/OMR with correct decimals; per-upload currency selection on the import wizard.

### Changed

- Removed a stale release zip from the repository.

## 1.0.1 - 2026-11-03

- Added `database/schema.sql` (full schema export), `database/seed.sql` (demo data), `database/migrations/` mirror and `docs/ERD.md`.
- Added top-level `Node Express API/prisma/migrations/` mirror of the API migrations for reviewers.

## [1.0.0] — 2026-11-02

### Added

- CSV/XLSX upload wizard with English + Bangla header auto-detection, preview, per-row error reporting.
- Sales analytics: revenue, orders, AOV, units, best product (revenue & quantity), best weekday, best date, daily/monthly trends, MoM and period growth, top products/customers.
- Provider-agnostic AI summaries (OpenAI default, Gemini, Anthropic, any OpenAI-compatible endpoint) in Bangla or English, with a deterministic rule-based fallback.
- Server-side PDF sales reports and invoices (pdfkit) with bundled Noto Sans Bengali, logo, charts and Bangla digits.
- Invoicing: customers, products, invoices with line items, tax, fixed/percent discount, statuses, automatic overdue, sequential numbering, CSV export.
- Company settings (logo, details, currency, tax, invoice notes/footer), AI settings with AES-256-GCM encrypted keys, team management with admin/staff roles.
- Bangla/English UI with persistent toggle, dark/light mode, responsive layout.
- Security: argon2id, rotating refresh tokens with reuse detection, CSRF double-submit, strict CSP, rate limits, lockout, RBAC, tenant scoping, upload hardening, redacted structured logs, env validation.
- Tooling: npm workspaces monorepo, shared types package, ESLint + Prettier, Vitest + Supertest tests, Dockerfile, docker-compose, Render blueprint, PM2 config, GitHub Actions CI, seed data, `DEMO_MODE`.
