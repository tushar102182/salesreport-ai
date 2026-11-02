# prisma/migrations (mirror)

Reviewer-facing copy of the committed Prisma migrations for the Node/Express API.
The API's canonical copy is `apps/server/prisma/migrations/` (next to `apps/server/prisma/schema.prisma`) and is applied with `npm run db:migrate`.
`20261102194014_init/migration.sql` creates the full database from empty. Keep both copies identical when adding migrations.
