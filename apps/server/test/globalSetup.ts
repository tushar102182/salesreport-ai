import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/** Creates a fresh SQLite test database from the migrations. */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: 'file:./test.db' };
  rmSync('prisma/test.db', { force: true });
  execSync('npx prisma migrate deploy', { stdio: 'ignore', env });
  return () => rmSync('prisma/test.db', { force: true });
}
