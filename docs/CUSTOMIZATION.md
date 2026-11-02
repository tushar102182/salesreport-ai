# Customization guide

Everything a buyer typically changes, with the exact files to edit.

## Rebranding

| What                         | Where                                                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product name in the UI       | `apps/web/src/components/layout/Logo.tsx`, `app.name` in `apps/web/src/i18n/locales/*.json`, `<title>` in `apps/web/index.html`, `appName` in `apps/server/src/modules/config.routes.ts`                                                   |
| Logo mark & favicon          | `apps/web/src/components/layout/Logo.tsx` (icon + gradient), `apps/web/public/favicon.svg`                                                                                                                                                 |
| Brand colours (web)          | `@theme` block in `apps/web/src/index.css` (`--color-brand-50 … 900`). All components use `brand-*` utilities, so changing these recolours the whole app. Chart colours: `apps/web/src/components/charts/Charts.tsx` (`BRAND`, `PALETTE`). |
| Brand colours (PDFs)         | `apps/server/src/modules/pdf/theme.ts` (`primary`, `accent`, `chart` …)                                                                                                                                                                    |
| PDF wording                  | `apps/server/src/modules/pdf/i18n.ts` (English + Bangla strings)                                                                                                                                                                           |
| PDF layout                   | `apps/server/src/modules/pdf/report.pdf.ts` (report), `invoice.pdf.ts` (invoice), `draw.ts` (charts, KPI cards, tables)                                                                                                                    |
| Fonts (web)                  | `@import` lines and `--font-sans` in `apps/web/src/index.css` (self-hosted via `@fontsource`, CSP-friendly)                                                                                                                                |
| Fonts (PDF)                  | Replace the TTFs in `apps/server/assets/fonts/` (keep the file names or edit `pdf/fonts.ts`). The font must contain **both** Latin and Bengali glyphs; see `assets/fonts/README.md` for how the bundled one was built.                     |
| Company details on documents | No code change: **Settings → Company** (logo, address, tax ID, footer, notes)                                                                                                                                                              |
| Demo data                    | `apps/server/src/demo/generator.ts` (products, customers, sales patterns), `demo/seed.ts` (company, invoices), `demo/constants.ts` (demo logins)                                                                                           |

## Adding a language

The UI, AI summaries, rule-based summaries and PDFs are all language-aware. Example: adding Hindi (`hi`).

1. **Shared** — `packages/shared/src/constants.ts`: add `'hi'` to `LANGUAGES`. In `format.ts` add month and weekday names to `MONTHS`, `MONTHS_LONG`, `WEEKDAYS` (and a digit converter if the script uses native digits, like `toBanglaDigits`).
2. **Web UI** — copy `apps/web/src/i18n/locales/en.json` to `hi.json`, translate, then register it in `apps/web/src/i18n/index.ts` (`resources` and `SUPPORTED_LANGUAGES`). Add a button in `components/layout/Toggles.tsx` and the summary language switch in `features/datasets/SummaryCard.tsx`.
3. **AI prompt** — `apps/server/src/modules/ai/summary.service.ts` → `buildPrompt`: map the code to a language name (e.g. `Hindi (Devanagari script)`).
4. **Rule-based engine** — `apps/server/src/modules/ai/ruleBased.ts`: add a template block for the new language (copy the English one).
5. **PDFs** — `apps/server/src/modules/pdf/i18n.ts`: add a strings object. If the script is not Latin/Bengali, bundle a font that covers it (e.g. Noto Sans Devanagari merged with Latin) and select it in `pdf/base.ts`.
6. Run `npm run typecheck` — TypeScript will point out every `Record<Language, …>` that still needs the new key.

## Changing / adding currencies

- The default currency for an organization is chosen in **Settings → Company** (BDT by default for new orgs via the Prisma default in `schema.prisma` → `currency String @default("BDT")`).
- The list of selectable currencies lives in `packages/shared/src/constants.ts` → `CURRENCIES` (`code`, `symbol`, `name`, `decimals`). Add an entry and it appears everywhere (validation, selects, formatting, PDFs).
- Number grouping: BDT and INR use lakh/crore grouping (`12,34,567`); everything else uses thousands. Adjust in `formatMoney` / `compactNumber` in `packages/shared/src/format.ts`.
- Datasets store the organization currency at import time; invoices store their own currency.
- Make sure the PDF font contains the currency symbol (the bundled font covers ৳ $ € £ ¥ ₹ and other symbols in U+20A0–20CF).

## Invoice numbering, tax and discounts

- Prefix and next number: **Settings → Company → Invoice number prefix** (`DFM-` → `DFM-000029`). Padding is set in `formatInvoiceNumber` (`packages/shared/src/invoice.ts`).
- Calculation order and rounding: `computeInvoiceTotals` in the same file (shared by UI preview and server, so they can never disagree).
- Add statuses: `INVOICE_STATUSES` in `packages/shared/src/constants.ts` + labels in locales + colour in `components/ui/Badge.tsx` and `pdf/invoice.pdf.ts`.

## AI providers & prompt

- Default models: `DEFAULT_LLM_MODELS` in `packages/shared/src/constants.ts`.
- Add a provider: create `apps/server/src/modules/ai/providers/<name>.ts` implementing `LlmCall`, register it in `providers/index.ts`, add the name to `LLM_PROVIDERS` and an env key in `config/env.ts` + `aiSettings.service.ts → envKeyFor`.
- Any OpenAI-compatible API (OpenRouter, Groq, Together, Azure via proxy, local Ollama/LM Studio) works with `LLM_PROVIDER=openai` + `OPENAI_BASE_URL` + `LLM_MODEL`.
- Prompt and output schema: `summary.service.ts` (`buildPrompt`, `llmOutputSchema`). The data sent is the aggregated `analyticsForPrompt` object — never raw rows.

## Upload limits & column synonyms

- Size/row limits: `UPLOAD_LIMITS` in `packages/shared/src/constants.ts`.
- Header auto-detection synonyms (English + Bangla): `packages/shared/src/columns.ts`.
- Number/date parsing rules: `apps/server/src/modules/datasets/normalize.ts`.

## Switching to PostgreSQL

1. Create a database, e.g. `createdb salesreport`.
2. Switch the Prisma provider and move the SQLite migrations aside:
   ```bash
   npm run db:use-postgres -w @salesreport/server
   ```
3. Set `DATABASE_URL=postgresql://user:pass@host:5432/salesreport?schema=public` in `.env`.
4. Create the PostgreSQL migration and seed:
   ```bash
   cd apps/server
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts   # optional demo data
   ```
5. Commit the new `prisma/migrations` folder. Production deploys run `prisma migrate deploy` automatically on start.

Search is case-insensitive on both databases (`lib/db.ts` adds `mode: 'insensitive'` for PostgreSQL). With PostgreSQL you can run multiple instances (PM2 cluster / several containers); with SQLite keep a single instance.

## Disabling public sign-up

Set `ALLOW_REGISTRATION=false`. Admins add users from **Settings → Team**.
