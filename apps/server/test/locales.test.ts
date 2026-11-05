import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Locale validation: every UI language file must have exactly the keys of en.json
 * (0 missing, 0 extra), keep the same {{placeholders}}, and be registered in i18n/index.ts.
 */
const here = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(here, '../../web/src/i18n');
const localesDir = join(i18nDir, 'locales');

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
function flatten(v: Json, prefix = '', out: Record<string, string> = {}) {
  if (Array.isArray(v)) v.forEach((x, i) => flatten(x, `${prefix}[${i}]`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = String(v);
  return out;
}
const load = (code: string) => flatten(JSON.parse(readFileSync(join(localesDir, `${code}.json`), 'utf8')) as Json);
const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const files = readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));
const en = load('en');
const index = readFileSync(join(i18nDir, 'index.ts'), 'utf8');

describe('UI locales', () => {
  it('ships at least 15 languages, all registered, with RTL for Arabic and Urdu', () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
    for (const code of ['en', 'bn', 'es', 'fr', 'ar', 'hi', 'pt', 'de', 'it', 'tr', 'id', 'ru', 'zh', 'ja', 'ur']) {
      expect(files, code).toContain(code);
      expect(index, code).toContain(`'${code}'`);
      expect(index, code).toContain(`./locales/${code}.json`);
    }
    expect(index).toMatch(/RTL_LANGUAGES[^=]*=\s*\[\s*'ar',\s*'ur'\s*\]/);
  });

  it.each(files)('%s has exactly the keys of en.json and the same placeholders', (code) => {
    const t = load(code);
    const missing = Object.keys(en).filter((k) => !(k in t));
    const extra = Object.keys(t).filter((k) => !(k in en));
    expect(missing, `${code} missing`).toEqual([]);
    expect(extra, `${code} extra`).toEqual([]);
    for (const k of Object.keys(en)) {
      expect(placeholders(t[k] ?? ''), `${code}:${k}`).toEqual(placeholders(en[k]!));
      expect((t[k] ?? '').trim().length, `${code}:${k} empty`).toBeGreaterThan(0);
    }
  });
});
