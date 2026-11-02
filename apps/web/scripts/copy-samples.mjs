// Copies /sample-data into public/samples so the upload page can offer sample downloads.
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = new URL('../../../sample-data/', import.meta.url);
const dest = new URL('../public/samples/', import.meta.url);
if (existsSync(src)) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}
