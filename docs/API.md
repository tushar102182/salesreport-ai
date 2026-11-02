# API reference

Base URL: `/api` (same origin as the web app). All request/response bodies are JSON unless noted.
Input is validated with the zod schemas in [`packages/shared/src/schemas`](../packages/shared/src/schemas) — import them in your own clients for type-safe calls.

## Conventions

**Authentication** — send the access token: `Authorization: Bearer <accessToken>`. Access tokens expire after `ACCESS_TOKEN_TTL_SECONDS` (default 15 min); call `POST /auth/refresh` to get a new one.

**Errors** — every error uses one envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "email", "message": "email.invalid" }],
    "requestId": "…"
  }
}
```

Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` / `TOKEN_INVALID` (401), `FORBIDDEN` / `CSRF_INVALID` (403), `NOT_FOUND` (404), `CONFLICT` / `EMAIL_TAKEN` / `IN_USE` (409), `FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE` (415), `UNPROCESSABLE` (422), `ACCOUNT_LOCKED` (423), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).
Validation messages are i18n keys (e.g. `password.upper`) translated by the web app.

**Pagination** — list endpoints accept `page` (1-based), `pageSize` (≤ 100), `q` (search), `sort` (`newest` | `oldest` | `name` | `amount`) and return:

```json
{ "items": [], "page": 1, "pageSize": 20, "total": 0, "totalPages": 1 }
```

**Rate limits** (per IP unless noted): all `/api` 600/15 min · login/register 10 failures/15 min · refresh 120/15 min · AI summary & AI test 20/h per user · uploads 60/h per user · PDFs 60/15 min per user. Standard `RateLimit` headers are returned.

**Roles** — `admin` can do everything; `staff` cannot manage users, AI settings, company settings, or delete records.

---

## Health & config

| Method | Path      | Auth | Description                                                                      |
| ------ | --------- | ---- | -------------------------------------------------------------------------------- |
| GET    | `/health` | —    | `{ status, db, version, uptimeSeconds, demoMode, time }` — 503 if DB unreachable |
| GET    | `/config` | —    | `{ appName, allowRegistration, demoMode, demoCredentials? }`                     |

## Auth

| Method | Path                    | Auth                            | Body / notes                                                                                                               |
| ------ | ----------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/auth/csrf`            | —                               | Issues the CSRF cookie, returns `{ csrfToken }`                                                                            |
| POST   | `/auth/register`        | —                               | `{ name, email, password, companyName }` → 201 `AuthResponse`. Creates an organization + admin                             |
| POST   | `/auth/login`           | —                               | `{ email, password }` → `AuthResponse`. 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`                                    |
| POST   | `/auth/refresh`         | refresh cookie + `X-CSRF-Token` | Rotates the refresh token → `AuthResponse`. Reuse of an old token → 401 `REFRESH_REUSED` and the session family is revoked |
| POST   | `/auth/logout`          | refresh cookie + `X-CSRF-Token` | 204. Revokes the session family                                                                                            |
| GET    | `/auth/me`              | Bearer                          | `{ user }`                                                                                                                 |
| POST   | `/auth/change-password` | Bearer                          | `{ currentPassword, newPassword }` → `AuthResponse`. Signs out all other sessions                                          |

`AuthResponse`: `{ accessToken, expiresIn, user: { id, email, name, role, organizationId, createdAt, lastLoginAt } }`. Login/register/refresh also set the `sr_rt` (httpOnly, path `/api/auth`) and `sr_csrf` cookies (`__Secure-`/`__Host-` prefixed when served over https).

Example:

```bash
curl -c jar -H 'content-type: application/json' -d '{"email":"demo@example.com","password":"Demo@12345"}' http://localhost:4000/api/auth/login
CSRF=$(grep sr_csrf jar | awk '{print $7}')
curl -b jar -c jar -X POST -H "X-CSRF-Token: $CSRF" http://localhost:4000/api/auth/refresh
```

## Users (admin)

| Method | Path         | Body                                                                            |
| ------ | ------------ | ------------------------------------------------------------------------------- |
| GET    | `/users`     | → `{ items: User[] }`                                                           |
| POST   | `/users`     | `{ name, email, password, role }` → 201 User                                    |
| PATCH  | `/users/:id` | `{ name?, role?, password? }` (cannot demote the last admin or change own role) |
| DELETE | `/users/:id` | 204 (cannot delete yourself or the last admin)                                  |

## Organization (company settings)

| Method | Path                 | Role  | Notes                                                                                                                                    |
| ------ | -------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/organization`      | any   | `OrganizationDto` (`hasLogo`, never the logo bytes)                                                                                      |
| PUT    | `/organization`      | admin | `{ name, address, phone, email, website, taxId, currency, defaultLanguage, invoicePrefix, defaultTaxRate, invoiceFooter, invoiceNotes }` |
| GET    | `/organization/logo` | any   | Image bytes (`image/png` \| `image/jpeg`)                                                                                                |
| POST   | `/organization/logo` | admin | `multipart/form-data`, field `logo`, PNG/JPEG ≤ 1 MB (magic bytes verified)                                                              |
| DELETE | `/organization/logo` | admin | Removes the logo                                                                                                                         |

## AI settings (admin)

| Method | Path                | Body / response                                                                                         |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/settings/ai`      | `{ provider, model, apiKeyMasked, hasOrgKey, effective: { provider, model, source }, demoMode }`        |
| PUT    | `/settings/ai`      | `{ provider: "openai"\|"gemini"\|"anthropic"\|null, model?, apiKey? }` — key is encrypted; omit to keep |
| DELETE | `/settings/ai/key`  | Removes the stored key                                                                                  |
| POST   | `/settings/ai/test` | `{ ok, provider, model?, latencyMs?, message }`                                                         |

`effective.source` is `organization`, `environment` (from `.env`) or `none` (rule-based engine).

## Customers / Products

| Method | Path                               | Notes                                                                                                                      |
| ------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/customers` · `/products`         | Paginated; `q` searches name/e-mail/phone (customers) or name/SKU (products)                                               |
| POST   | `/customers` · `/products`         | Customer: `{ name, email?, phone?, address?, notes? }` · Product: `{ name, sku?, description?, unit?, unitPrice, active }` |
| GET    | `/customers/:id` · `/products/:id` |                                                                                                                            |
| PUT    | `/customers/:id` · `/products/:id` | Full update                                                                                                                |
| DELETE | `/customers/:id` · `/products/:id` | admin. Customers with invoices → 409 `IN_USE`                                                                              |

## Invoices

| Method | Path                            | Notes                                                                                       |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------- |
| GET    | `/invoices`                     | Paginated; filters `status`, `customerId`, `from`, `to` (YYYY-MM-DD), `q` (number/customer) |
| GET    | `/invoices/export.csv`          | Same filters; CSV with formula-injection protection                                         |
| POST   | `/invoices`                     | See body below → 201 `InvoiceDto` with a new sequential `number`                            |
| GET    | `/invoices/:id`                 | `InvoiceDto` incl. `items` and `customer`                                                   |
| PUT    | `/invoices/:id`                 | Same body as POST (number is kept)                                                          |
| PATCH  | `/invoices/:id/status`          | `{ status: "draft"\|"sent"\|"paid"\|"overdue" }` (sets/clears `paidAt`)                     |
| GET    | `/invoices/:id/pdf?lang=en\|bn` | `application/pdf` download                                                                  |
| DELETE | `/invoices/:id`                 | admin                                                                                       |

```json
{
  "customerId": "…",
  "issueDate": "2026-03-01",
  "dueDate": "2026-03-15",
  "status": "draft",
  "currency": "BDT",
  "language": "bn",
  "taxRate": 5,
  "discountType": "percent",
  "discountValue": 10,
  "notes": "Thank you!",
  "items": [{ "productId": "…", "description": "Miniket Rice 25kg", "quantity": 2, "unitPrice": 1950 }]
}
```

Totals are **always computed on the server** (`computeInvoiceTotals` in `packages/shared/src/invoice.ts`, integer minor units): line totals → subtotal → discount (capped at subtotal) → tax on the discounted amount → total. Client-sent totals are ignored. Sent invoices past their due date are marked `overdue` automatically.

## Datasets (sales data)

| Method | Path                                | Notes                                                                                                                                                              |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/datasets/preview`                 | `multipart/form-data` `file` (.csv/.xlsx ≤ 10 MB) → `{ fileName, fileType, headers, rows (first 20), totalRows, suggestedMapping }`                                |
| POST   | `/datasets`                         | multipart: `file`, `name`, `mapping` (JSON string of `ColumnMapping`), `dateFormat` (`auto`\|`DMY`\|`MDY`\|`YMD`) → 201 `{ dataset, imported, skipped, errors[] }` |
| GET    | `/datasets`                         | Paginated, includes `totalRevenue`                                                                                                                                 |
| GET    | `/datasets/:id`                     | Dataset + `columnMapping`                                                                                                                                          |
| GET    | `/datasets/:id/analytics`           | `Analytics` (see `packages/shared/src/schemas/dataset.ts`)                                                                                                         |
| GET    | `/datasets/:id/summary?lang=en\|bn` | `{ summary: AiSummary \| null }` (cached)                                                                                                                          |
| POST   | `/datasets/:id/summary`             | `{ language, regenerate? }` → `{ summary, cached, fallbackReason? }`                                                                                               |
| GET    | `/datasets/:id/report.pdf?lang=`    | Branded PDF report (generates the summary if needed)                                                                                                               |
| GET    | `/datasets/:id/export.csv`          | Normalized records as CSV                                                                                                                                          |
| DELETE | `/datasets/:id`                     | admin                                                                                                                                                              |

`ColumnMapping`: `{ date, product, quantity?, unitPrice?, total?, customer? }` — values are header names from the file. `total` or both `quantity` and `unitPrice` are required.

Example:

```bash
curl -H "Authorization: Bearer $TOKEN" -F file=@sample-data/sales-sample.csv http://localhost:4000/api/datasets/preview
curl -H "Authorization: Bearer $TOKEN" -F file=@sample-data/sales-sample.csv -F name="Q2 sales" \
  -F 'mapping={"date":"Order Date","product":"Product Name","quantity":"Quantity","unitPrice":"Unit Price","total":"Total","customer":"Customer"}' \
  http://localhost:4000/api/datasets
curl -H "Authorization: Bearer $TOKEN" -o report.pdf "http://localhost:4000/api/datasets/<id>/report.pdf?lang=bn"
```

`AiSummary`: `{ language, provider: "openai"|"gemini"|"anthropic"|"rule-based", model, headline, overview, insights[], recommendations[], generatedAt }`.

## Dashboard

| Method | Path                    | Notes                                                                                                                |
| ------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/dashboard?datasetId=` | `{ currency, counts, invoiceTotals (by status), recentInvoices, dataset, analytics }` — latest dataset if none given |
