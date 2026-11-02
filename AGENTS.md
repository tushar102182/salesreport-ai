# AGENTS.md — guide for AI coding agents and developers

## What this is
SalesReport AI: multi-tenant sales analytics + invoicing. Users upload CSV/XLSX sales data, get analytics and an AI summary (Bangla or English), download PDF reports, and manage customers, products and invoices.

## Layout
- `apps/server` — Express 5 + Prisma API (TypeScript, ESM). Feature modules in `src/modules/<feature>/` follow **routes → controller → service → repository**.
- `apps/web` — React 18 + Vite + Tailwind SPA. Features in `src/features/<feature>/`, shared UI in `src/components/ui`, data fetching with TanStack Query (`src/lib/queries.ts`), translations in `src/i18n/locales/{en,bn}.json`.
- `packages/shared` — zod schemas, types, invoice math and formatting shared by both apps. Change validation here, not in one app only.

## Commands
`npm run dev` · `npm test` · `npm run lint` · `npm run typecheck` · `npm run build` · `npm run db:migrate` · `npm run db:seed`

## Rules
- Every query must be scoped by `organizationId` from `req.auth.organizationId` (tenant isolation). Never trust an org id from the client.
- Mutating routes require auth + CSRF; admin-only routes use `requireRole('admin')`.
- Validate all input with the shared zod schemas (`lib/validate.ts`).
- Never log secrets; the logger redacts known fields — keep it that way.
- Add both `en` and `bn` strings for any new UI text; PDF strings live in `apps/server/src/modules/pdf/i18n.ts`.
- Schema changes: edit `prisma/schema.prisma`, then `npx prisma migrate dev --name <change>` in `apps/server`.
- New LLM provider: implement `providers/types.ts` and register in `providers/index.ts`.
- Add or update tests in `apps/server/test` for any behaviour change.
