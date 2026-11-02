import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Locates the bundled font directory (apps/server/assets/fonts) both when running
 * from source (tsx) and from the bundled dist/ build. Override with PDF_FONT_DIR.
 */
function findFontDir(): string {
  if (process.env.PDF_FONT_DIR) return process.env.PDF_FONT_DIR;
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'assets', 'fonts');
    if (existsSync(path.join(candidate, 'NotoSansBengaliUI-Regular.ttf'))) return candidate;
    dir = path.dirname(dir);
  }
  return path.resolve(process.cwd(), 'assets', 'fonts');
}

const FONT_DIR = findFontDir();

/**
 * Noto Sans Bengali merged with a Latin subset of Noto Sans (both SIL OFL 1.1), so
 * mixed Bangla/English text renders with correct conjunct shaping in one font.
 */
export const FONTS = {
  regular: path.join(FONT_DIR, 'NotoSansBengaliUI-Regular.ttf'),
  bold: path.join(FONT_DIR, 'NotoSansBengaliUI-Bold.ttf'),
};
