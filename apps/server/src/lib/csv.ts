/**
 * CSV export helpers with formula-injection (CSV injection) protection.
 * Cells beginning with = + - @ TAB or CR are prefixed with a single quote so
 * spreadsheet apps treat them as text. See OWASP "CSV Injection".
 */
const DANGEROUS = /^[=+\-@\t\r]/;

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  // Numbers (including negatives) are safe and should stay numeric.
  if (typeof value !== 'number' && DANGEROUS.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(sanitizeCsvCell).join(',')];
  for (const r of rows) lines.push(r.map(sanitizeCsvCell).join(','));
  // BOM so Excel opens UTF-8 (Bangla) correctly.
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** RFC 6266 Content-Disposition with an ASCII fallback and UTF-8 filename*. */
export function contentDisposition(filename: string, inline = false): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
