import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UPLOAD_LIMITS } from '@salesreport/shared';
import { unprocessable } from '../../lib/errors';

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

const cleanHeader = (h: unknown, idx: number) => {
  const s = String(h ?? '')
    .replace(/^\uFEFF/, '')
    // eslint-disable-next-line no-control-regex -- strip control characters from untrusted headers
    .replace(/[\u0000-\u001F]/g, '')
    .trim()
    .slice(0, 200);
  return s || `Column ${idx + 1}`;
};

/** Makes headers unique ("Total", "Total (2)") and guards against prototype keys. */
function uniqueHeaders(raw: unknown[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    let name = cleanHeader(h, i);
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') name = `_${name}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return n > 1 ? `${name} (${n})` : name;
  });
}

function toObjects(matrix: unknown[][]): ParsedSheet {
  const nonEmpty = matrix.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
  const [head, ...body] = nonEmpty;
  if (!head) throw unprocessable('The file is empty');
  const headers = uniqueHeaders(head);
  if (body.length > UPLOAD_LIMITS.maxRows) {
    throw unprocessable(`Too many rows (max ${UPLOAD_LIMITS.maxRows.toLocaleString('en')})`);
  }
  const rows = body.map((r) => {
    const o: Record<string, string> = Object.create(null) as Record<string, string>;
    headers.forEach((h, i) => {
      const v = r[i];
      o[h] = v instanceof Date ? (Number.isNaN(v.getTime()) ? '' : v.toISOString()) : String(v ?? '').trim();
    });
    return o;
  });
  return { headers, rows };
}

export function parseCsv(buf: Buffer): ParsedSheet {
  const text = buf.toString('utf8').replace(/^\uFEFF/, '');
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy', dynamicTyping: false });
  if (result.errors.length && !result.data.length) throw unprocessable('Could not parse the CSV file');
  return toObjects(result.data);
}

/** Date cells become YYYY-MM-DD strings; untyped serial numbers are still handled in normalize.ts. */
export function parseXlsx(buf: Buffer): ParsedSheet {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, {
      type: 'buffer',
      cellDates: false,
      cellNF: true,
      cellFormula: false,
      cellHTML: false,
      sheetRows: UPLOAD_LIMITS.maxRows + 2,
    });
  } catch {
    throw unprocessable('Could not read the Excel workbook');
  }
  const first = wb.SheetNames[0];
  const sheet = first ? wb.Sheets[first] : undefined;
  if (!sheet) throw unprocessable('The workbook has no sheets');
  // Convert date-formatted numeric cells to YYYY-MM-DD using SheetJS' calendar math (no timezone involved).
  for (const [addr, cell] of Object.entries(sheet)) {
    if (addr.startsWith('!')) continue;
    const c = cell as XLSX.CellObject;
    if (c.t === 'n' && typeof c.v === 'number' && c.z && XLSX.SSF.is_date(String(c.z))) {
      const p = XLSX.SSF.parse_date_code(c.v);
      if (p) {
        c.t = 's';
        delete c.z;
        delete c.w;
        c.v = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
      }
    }
  }
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '', blankrows: false });
  return toObjects(matrix);
}

export function parseSpreadsheet(buf: Buffer, type: 'csv' | 'xlsx'): ParsedSheet {
  return type === 'xlsx' ? parseXlsx(buf) : parseCsv(buf);
}
