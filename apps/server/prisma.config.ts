import path from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// One .env for the whole monorepo (repo root), with apps/server/.env as an optional override.
config({ path: [path.resolve('.env'), path.resolve('../../.env')], quiet: true });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
