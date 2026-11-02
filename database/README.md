# Database

| File | What it is |
|---|---|
| `schema.sql` | Full schema export generated from the Prisma migrations (SQLite dialect). |
| `seed.sql` | Demo data: 1 company, 2 users, 12 products, 12 customers, 2,158 sales rows, 28 invoices. |
| `migrations/0001_init.sql` | Mirror of the committed Prisma migration that creates the DB from empty. |

The canonical migrations live in `apps/server/prisma/migrations/` and are applied with `npm run db:migrate` (Prisma Migrate). Seed with `npm run db:seed`.

Manual setup without Node: `sqlite3 salesreport.db < database/schema.sql && sqlite3 salesreport.db < database/seed.sql`.

Demo logins (change them on public deployments): `demo@example.com` / `Demo@12345`, `staff@example.com` / `Staff@12345`.
