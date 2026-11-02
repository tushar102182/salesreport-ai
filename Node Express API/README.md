# Node Express API — migrations (reviewer copy)

The Node/Express API source lives in `apps/server/` (schema: `apps/server/prisma/schema.prisma`).
This folder holds a reviewer copy of its committed Prisma migrations:

- `prisma/migrations/20261102194014_init/migration.sql` — creates the full database from empty
- `prisma/migrations/0001_init.sql` — same SQL as a single flat file

The app applies the canonical copy in `apps/server/prisma/migrations/` with `npm run db:migrate`.
Full schema export: `database/schema.sql`. Demo data: `database/seed.sql`.
