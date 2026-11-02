import PDFDocument from 'pdfkit';
import { toBanglaDigits, type Language } from '@salesreport/shared';
import { FONTS } from './fonts';
import { THEME } from './theme';

export type Doc = PDFKit.PDFDocument;

export const F = { regular: 'Body', bold: 'Bold' } as const;

/** Creates a PDF document with the bundled Bangla+Latin font registered. */
export function createDoc(meta: { title: string; author: string; lang: Language }) {
  const doc = new PDFDocument({
    size: THEME.page.size,
    margin: THEME.page.margin,
    bufferPages: true,
    info: { Title: meta.title, Author: meta.author, Creator: 'SalesReport AI', Producer: 'SalesReport AI' },
    lang: meta.lang === 'bn' ? 'bn-BD' : 'en-US',
    displayTitle: true,
  });
  doc.registerFont(F.regular, FONTS.regular);
  doc.registerFont(F.bold, FONTS.bold);
  doc.font(F.regular).fillColor(THEME.text);

  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return { doc, done };
}

export const contentWidth = (doc: Doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;
export const pageBottom = (doc: Doc) => doc.page.height - doc.page.margins.bottom - 24;

/** Adds a page if fewer than `height` points remain. Returns true if a page was added. */
export function ensureSpace(doc: Doc, height: number): boolean {
  if (doc.y + height > pageBottom(doc)) {
    doc.addPage();
    return true;
  }
  return false;
}

export function roundedRect(
  doc: Doc,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
) {
  doc.save();
  doc.roundedRect(x, y, w, h, r);
  if (stroke) doc.lineWidth(0.75).fillAndStroke(fill, stroke);
  else doc.fill(fill);
  doc.restore();
}

export function sectionTitle(doc: Doc, title: string, x = doc.page.margins.left) {
  const y = doc.y;
  doc
    .save()
    .roundedRect(x, y + 3, 3, 13, 1.5)
    .fill(THEME.primary)
    .restore();
  doc
    .font(F.bold)
    .fontSize(12)
    .fillColor(THEME.text)
    .text(title, x + 10, y, { lineBreak: false });
  doc.y = y + 24;
  doc.x = doc.page.margins.left;
}

/** Draws "Company • Page 1 of 3 • SalesReport AI" footers on every buffered page. */
export function drawFooters(doc: Doc, left: string, lang: Language, labels: { page: string; of: string }) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = doc.page.height - doc.page.margins.bottom + 6;
    const x = doc.page.margins.left;
    const w = contentWidth(doc);
    const oldBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // allow writing in the margin without triggering a new page
    doc
      .save()
      .moveTo(x, y - 6)
      .lineTo(x + w, y - 6)
      .lineWidth(0.5)
      .strokeColor(THEME.border)
      .stroke()
      .restore();
    doc.font(F.regular).fontSize(8).fillColor(THEME.muted);
    doc.text(left, x, y, { width: w / 2, lineBreak: false, ellipsis: true });
    const n = `${labels.page} ${i + 1} ${labels.of} ${range.count}`;
    doc.text(lang === 'bn' ? toBanglaDigits(n) : n, x + w / 2, y, { width: w / 2, align: 'right', lineBreak: false });
    doc.page.margins.bottom = oldBottom;
  }
}

/** Safely embeds a PNG/JPEG logo, fitting it inside the box. Ignores corrupt images. */
export function drawLogo(
  doc: Doc,
  logo: Uint8Array | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (!logo) return false;
  try {
    doc.image(Buffer.from(logo), x, y, { fit: [w, h], align: 'center', valign: 'center' });
    return true;
  } catch {
    return false;
  }
}

/** Splits a range into ~`count` "nice" tick values. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(v);
  return ticks;
}
