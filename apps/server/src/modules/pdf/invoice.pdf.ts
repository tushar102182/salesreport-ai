import type { Organization } from '@prisma/client';
import {
  formatDate,
  formatMoney,
  formatNumber,
  getCurrency,
  toBanglaDigits,
  type InvoiceDto,
  type Language,
} from '@salesreport/shared';
import { contentWidth, createDoc, drawFooters, drawLogo, F, roundedRect, type Doc } from './base';
import { oneLine, tableHeader, type Column } from './draw';
import { pdfStrings } from './i18n';
import { fxAsOfText, fxNoteText, type PdfFxNote } from './fx';
import { THEME } from './theme';

interface InvoiceInput {
  invoice: InvoiceDto;
  org: Organization;
  lang: Language;
  /** Present when the amounts were converted to a display currency (approximate). */
  fx?: PdfFxNote;
}

const STATUS_COLOR: Record<string, string> = {
  draft: THEME.muted,
  sent: THEME.primary,
  paid: THEME.success,
  overdue: THEME.danger,
};

/** Letter-spacing breaks Bangla conjunct shaping, so it is only applied to Latin labels. */
const label = (lang: Language, text: string) =>
  lang === 'bn' ? { text, opts: {} } : { text: text.toUpperCase(), opts: { characterSpacing: 0.6 } };

function infoBlock(doc: Doc, lang: Language, title: string, lines: string[], x: number, y: number, w: number) {
  const l = label(lang, title);
  doc
    .font(F.bold)
    .fontSize(8)
    .fillColor(THEME.muted)
    .text(l.text, x, y, { width: w, lineBreak: false, ...l.opts });
  let cy = y + 15;
  lines.forEach((line, i) => {
    doc
      .font(i === 0 ? F.bold : F.regular)
      .fontSize(i === 0 ? 11 : 8.8)
      .fillColor(i === 0 ? THEME.text : '#334155');
    doc.text(line, x, cy, { width: w });
    cy = doc.y + 2;
  });
  return cy;
}

export async function renderInvoicePdf({ invoice: inv, org, lang, fx }: InvoiceInput): Promise<Buffer> {
  const t = pdfStrings(lang);
  const money = (n: number) => formatMoney(n, inv.currency, lang);
  const n = (v: number) => formatNumber(v, lang, { decimals: Number.isInteger(v) ? 0 : 2 });
  const { doc, done } = createDoc({ title: `${t.invoice} ${inv.number}`, author: org.name, lang });
  const x = doc.page.margins.left;
  const w = contentWidth(doc);

  // Top accent bar
  const grad = doc.linearGradient(0, 0, doc.page.width, 0);
  grad.stop(0, THEME.primaryDark).stop(1, THEME.accent);
  doc.save().rect(0, 0, doc.page.width, 8).fill(grad).restore();

  // Company (left)
  let y = 40;
  let textX = x;
  if (org.logo && drawLogo(doc, org.logo, x, y, 64, 64)) textX = x + 76;
  doc.font(F.bold).fontSize(16).fillColor(THEME.text);
  oneLine(doc, org.name, textX, y, w * 0.55 - (textX - x));
  doc.font(F.regular).fontSize(8.5).fillColor(THEME.muted);
  const companyLines = [
    org.address,
    [org.phone, org.email].filter(Boolean).join(' • '),
    org.website,
    org.taxId ? `${t.taxId}: ${org.taxId}` : null,
  ].filter((l): l is string => Boolean(l));
  let cy = y + 22;
  for (const line of companyLines) {
    doc.text(line, textX, cy, { width: w * 0.55 - (textX - x) });
    cy = doc.y + 1;
  }

  // Title + number (right)
  const rx = x + w * 0.55;
  const rw = w * 0.45;
  doc
    .font(F.bold)
    .fontSize(26)
    .fillColor(THEME.primary)
    .text(t.invoice, rx, y - 4, { width: rw, align: 'right', lineBreak: false });
  doc
    .font(F.bold)
    .fontSize(11)
    .fillColor(THEME.text)
    .text(`# ${inv.number}`, rx, y + 34, { width: rw, align: 'right', lineBreak: false });
  const statusLabel = t[`status_${inv.status}` as const];
  doc.font(F.bold).fontSize(8);
  const sw = doc.widthOfString(statusLabel) + 20;
  roundedRect(doc, x + w - sw, y + 54, sw, 18, 9, STATUS_COLOR[inv.status] ?? THEME.muted);
  doc.fillColor(THEME.white).text(statusLabel, x + w - sw, y + 58.5, { width: sw, align: 'center', lineBreak: false });

  // Bill to / details
  y = Math.max(cy, y + 84) + 22;
  roundedRect(doc, x, y, w, 1, 0, THEME.border);
  y += 18;
  const half = (w - 20) / 2;
  const customerLines = [inv.customer.name, inv.customer.address, inv.customer.phone, inv.customer.email].filter(
    (l): l is string => Boolean(l),
  );
  const leftEnd = infoBlock(doc, lang, t.billTo, customerLines, x, y, half);

  const details: [string, string][] = [
    [t.invoiceNo, inv.number],
    [t.issueDate, formatDate(inv.issueDate, lang)],
    ...(inv.dueDate ? ([[t.dueDate, formatDate(inv.dueDate, lang)]] as [string, string][]) : []),
    [t.currency, `${getCurrency(inv.currency).code} (${getCurrency(inv.currency).symbol.trim()})`],
    ...(fx
      ? ([
          [t.originalCurrency, fx.from],
          [t.rate, fxNoteText(fx, inv.currency, lang)],
          [t.ratesAsOf, fxAsOfText(fx, lang)],
        ] as [string, string][])
      : []),
    ...(inv.paidAt ? ([[t.paidOn, formatDate(inv.paidAt, lang)]] as [string, string][]) : []),
  ];
  const dx = x + half + 20;
  roundedRect(doc, dx, y - 6, half, details.length * 18 + 14, 8, THEME.surface);
  let dy = y + 2;
  for (const [label, value] of details) {
    doc
      .font(F.regular)
      .fontSize(8.5)
      .fillColor(THEME.muted)
      .text(label, dx + 12, dy, { width: half / 2, lineBreak: false });
    doc.font(F.bold).fillColor(THEME.text);
    oneLine(doc, value, dx + half / 2, dy, half / 2 - 12, 'right');
    dy += 18;
  }
  y = Math.max(leftEnd, dy + 8) + 18;

  // Items table
  const cols: Column[] = [
    { header: '#', width: 28, align: 'center' },
    { header: t.description, width: w - 28 - 60 - 100 - 110 },
    { header: t.quantity, width: 60, align: 'right' },
    { header: t.unitPrice, width: 100, align: 'right' },
    { header: t.amount, width: 110, align: 'right' },
  ];
  y = tableHeader(doc, cols, x, y, { fill: THEME.primary, color: THEME.white, h: 24 });
  inv.items.forEach((it, i) => {
    doc.font(F.regular).fontSize(9);
    const descH = doc.heightOfString(it.description, { width: cols[1]!.width - 16 });
    const rowH = Math.max(24, descH + 12);
    if (y + rowH > doc.page.height - 150) {
      doc.addPage();
      y = tableHeader(doc, cols, x, doc.page.margins.top, { fill: THEME.primary, color: THEME.white, h: 24 });
    }
    if (i % 2 === 1) doc.save().rect(x, y, w, rowH).fill(THEME.surface).restore();
    let cx = x;
    doc.fillColor(THEME.muted);
    oneLine(doc, lang === 'bn' ? toBanglaDigits(i + 1) : String(i + 1), cx, y + 7, cols[0]!.width, 'center');
    cx += cols[0]!.width;
    doc.fillColor(THEME.text).text(it.description, cx + 8, y + 6, { width: cols[1]!.width - 16 });
    cx += cols[1]!.width;
    oneLine(doc, n(it.quantity), cx + 8, y + 7, cols[2]!.width - 16, 'right');
    cx += cols[2]!.width;
    oneLine(doc, money(it.unitPrice), cx + 8, y + 7, cols[3]!.width - 16, 'right');
    cx += cols[3]!.width;
    doc.font(F.bold);
    oneLine(doc, money(it.lineTotal), cx + 8, y + 7, cols[4]!.width - 16, 'right');
    y += rowH;
    doc
      .save()
      .moveTo(x, y)
      .lineTo(x + w, y)
      .lineWidth(0.5)
      .strokeColor(THEME.border)
      .stroke()
      .restore();
  });

  // Totals
  y += 14;
  if (y + 130 > doc.page.height - 60) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  const tw = 240;
  const tx = x + w - tw;
  const discountLabel =
    inv.discountType === 'percent'
      ? `${t.discount} (${formatNumber(inv.discountValue, lang, { decimals: inv.discountValue % 1 ? 2 : 0 })}%)`
      : t.discount;
  const rows: [string, string][] = [
    [t.subtotal, money(inv.subtotal)],
    ...(inv.discountTotal > 0 ? ([[discountLabel, `- ${money(inv.discountTotal)}`]] as [string, string][]) : []),
    [`${t.tax} (${formatNumber(inv.taxRate, lang, { decimals: inv.taxRate % 1 ? 2 : 0 })}%)`, money(inv.taxTotal)],
  ];
  const totalsTop = y;
  for (const [label, value] of rows) {
    doc
      .font(F.regular)
      .fontSize(9.5)
      .fillColor(THEME.muted)
      .text(label, tx + 12, y, { width: tw / 2, lineBreak: false });
    doc.fillColor(THEME.text);
    oneLine(doc, value, tx + tw / 2, y, tw / 2 - 12, 'right');
    y += 20;
  }
  roundedRect(doc, tx, y, tw, 34, 8, THEME.primary);
  doc
    .font(F.bold)
    .fontSize(11)
    .fillColor(THEME.white)
    .text(t.total, tx + 12, y + 10, { width: tw / 2, lineBreak: false });
  doc.fontSize(13);
  oneLine(doc, money(inv.total), tx + tw / 2 - 20, y + 8.5, tw / 2 + 8, 'right');
  y += 50;

  // Notes (left of totals)
  const notes = [inv.notes, org.invoiceNotes].filter((s): s is string => Boolean(s)).join('\n\n');
  if (notes) {
    const nw = w - tw - 24;
    const nl = label(lang, t.notes);
    doc
      .font(F.bold)
      .fontSize(8)
      .fillColor(THEME.muted)
      .text(nl.text, x, totalsTop, { width: nw, ...nl.opts });
    doc
      .font(F.regular)
      .fontSize(8.8)
      .fillColor('#334155')
      .text(notes, x, doc.y + 4, { width: nw, lineGap: 1.5 });
    y = Math.max(y, doc.y + 16);
  }

  // PAID watermark (very light, rotated across the page centre)
  if (inv.status === 'paid') {
    const cx = doc.page.width / 2;
    const cyMid = doc.page.height / 2 + 40;
    doc.save();
    doc.rotate(-24, { origin: [cx, cyMid] });
    doc
      .roundedRect(cx - 170, cyMid - 52, 340, 104, 18)
      .lineWidth(6)
      .strokeOpacity(0.1)
      .stroke(THEME.success);
    doc.font(F.bold).fontSize(64).fillOpacity(0.1).fillColor(THEME.success);
    doc.text(t.status_paid, cx - 170, cyMid - 42, { width: 340, align: 'center', lineBreak: false });
    doc.restore();
  }

  // Thank-you + footer text
  doc
    .font(F.bold)
    .fontSize(10.5)
    .fillColor(THEME.primary)
    .text(t.thankYou, x, Math.min(y, doc.page.height - 110), { width: w, align: 'center' });
  if (org.invoiceFooter) {
    doc
      .font(F.regular)
      .fontSize(8)
      .fillColor(THEME.muted)
      .text(org.invoiceFooter, x, doc.y + 6, { width: w, align: 'center' });
  }

  drawFooters(doc, `${org.name} · ${t.invoice} ${inv.number}`, lang, t);
  doc.end();
  return done;
}
