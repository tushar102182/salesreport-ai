#!/usr/bin/env node
// Creates .env from .env.example with freshly generated secrets (never overwrites an existing .env).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, '.env');
if (existsSync(target)) {
  console.log('✔ .env already exists — leaving it untouched.');
  process.exit(0);
}
const env = readFileSync(path.join(root, '.env.example'), 'utf8')
  .replace(/^JWT_ACCESS_SECRET=.*$/m, `JWT_ACCESS_SECRET=${randomBytes(48).toString('base64url')}`)
  .replace(/^ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`);
writeFileSync(target, env, { mode: 0o600 });
console.log(
  '✔ Created .env with random JWT_ACCESS_SECRET and ENCRYPTION_KEY. Add your LLM API key to enable AI summaries.',
);
