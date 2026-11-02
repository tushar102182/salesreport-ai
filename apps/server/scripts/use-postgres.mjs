#!/usr/bin/env node
// Switches the Prisma datasource from SQLite to PostgreSQL.
// Moves the SQLite migrations aside; then run:  npx prisma migrate dev --name init
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

const schemaPath = 'prisma/schema.prisma';
const schema = readFileSync(schemaPath, 'utf8');
if (schema.includes('provider = "postgresql"')) {
  console.log('Already using PostgreSQL.');
  process.exit(0);
}
writeFileSync(schemaPath, schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"'));
if (existsSync('prisma/migrations')) renameSync('prisma/migrations', `prisma/migrations-sqlite-${Date.now()}`);
console.log('✔ Prisma provider set to postgresql and SQLite migrations moved aside.');
console.log('Next: set DATABASE_URL=postgresql://… in .env, then run');
console.log('      npx prisma migrate dev --name init   (creates PostgreSQL migrations)');
