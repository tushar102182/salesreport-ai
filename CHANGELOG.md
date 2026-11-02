# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

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
