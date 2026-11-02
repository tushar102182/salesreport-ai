import { compactNumber, type Language } from '@salesreport/shared';
import { F, niceTicks, roundedRect, type Doc } from './base';
import { THEME } from './theme';

/** Truncates `text` with an ellipsis so it fits `width` at the current font/size. */
export function truncate(doc: Doc, text: string, width: number): string {
  if (doc.widthOfString(text) <= width) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(`${text.slice(0, mid)}…`) <= width) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

/** Picks the largest font size ≤ max that fits `text` in `width`. */
export function fitFontSize(doc: Doc, text: string, width: number, max: number, min = 8): number {
  let size = max;
  doc.fontSize(size);
  while (size > min && doc.widthOfString(text) > width) {
    size -= 0.5;
    doc.fontSize(size);
  }
  return size;
}

export function oneLine(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  align: 'left' | 'right' | 'center' = 'left',
) {
  doc.text(truncate(doc, text, width), x, y, { width, align, lineBreak: false });
}

export interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'success' | 'danger';
}

export function kpiGrid(doc: Doc, cards: KpiCard[], x: number, y: number, width: number, cols = 4, h = 64, gap = 10) {
  const w = (width - gap * (cols - 1)) / cols;
  cards.forEach((c, i) => {
    const cx = x + (i % cols) * (w + gap);
    const cy = y + Math.floor(i / cols) * (h + gap);
    roundedRect(doc, cx, cy, w, h, 8, THEME.white, THEME.border);
    doc
      .save()
      .roundedRect(cx, cy + 10, 3, h - 20, 1.5)
      .fill(i % cols === 0 ? THEME.primary : THEME.chart[i % THEME.chart.length]!)
      .restore();
    doc.font(F.regular).fontSize(8).fillColor(THEME.muted);
    oneLine(doc, c.label, cx + 12, cy + 9, w - 20);
    const color = c.tone === 'success' ? THEME.success : c.tone === 'danger' ? THEME.danger : THEME.text;
    doc.font(F.bold).fillColor(color);
    fitFontSize(doc, c.value, w - 22, 15, 9);
    oneLine(doc, c.value, cx + 12, cy + 23, w - 20);
    if (c.sub) {
      doc.font(F.regular).fontSize(7.5).fillColor(THEME.muted);
      oneLine(doc, c.sub, cx + 12, cy + h - 18, w - 20);
    }
  });
  return y + Math.ceil(cards.length / cols) * (h + gap) - gap;
}

interface ChartBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function axes(doc: Doc, box: ChartBox, max: number, lang: Language, currency: string) {
  const ticks = niceTicks(max, 4);
  const top = ticks.at(-1) ?? 1;
  const axisW = 44;
  const plot = { x: box.x + axisW, y: box.y + 6, w: box.w - axisW - 4, h: box.h - 26 };
  doc.font(F.regular).fontSize(7).fillColor(THEME.muted);
  for (const t of ticks) {
    const ty = plot.y + plot.h - (t / top) * plot.h;
    doc
      .save()
      .moveTo(plot.x, ty)
      .lineTo(plot.x + plot.w, ty)
      .lineWidth(0.5)
      .dash(2, { space: 2 })
      .strokeColor(THEME.border)
      .stroke()
      .undash()
      .restore();
    doc.text(compactNumber(t, lang, currency), box.x, ty - 4, { width: axisW - 6, align: 'right', lineBreak: false });
  }
  return { plot, top };
}

export function barChart(
  doc: Doc,
  box: ChartBox,
  data: { label: string; value: number }[],
  opts: { lang: Language; currency: string; showValues?: boolean },
) {
  if (!data.length) return;
  const max = Math.max(...data.map((d) => d.value), 1);
  const { plot, top } = axes(doc, box, max, opts.lang, opts.currency);
  const slot = plot.w / data.length;
  const bw = Math.min(34, slot * 0.62);
  const best = data.reduce((b, d, i) => (d.value > (data[b]?.value ?? 0) ? i : b), 0);
  data.forEach((d, i) => {
    const bh = Math.max(1, (d.value / top) * plot.h);
    const bx = plot.x + i * slot + (slot - bw) / 2;
    const by = plot.y + plot.h - bh;
    doc
      .save()
      .roundedRect(bx, by, bw, bh, Math.min(4, bw / 4))
      .fill(i === best ? THEME.primary : '#A5B4FC')
      .restore();
    doc.font(F.regular).fontSize(7).fillColor(THEME.muted);
    oneLine(doc, d.label, plot.x + i * slot, plot.y + plot.h + 5, slot, 'center');
    if (opts.showValues) {
      doc.font(F.bold).fontSize(6.5).fillColor(THEME.text);
      oneLine(doc, compactNumber(d.value, opts.lang, opts.currency), plot.x + i * slot, by - 10, slot, 'center');
    }
  });
}

export function lineChart(
  doc: Doc,
  box: ChartBox,
  data: { label: string; value: number }[],
  opts: { lang: Language; currency: string; labelEvery?: number },
) {
  if (data.length < 2) return;
  const max = Math.max(...data.map((d) => d.value), 1);
  const { plot, top } = axes(doc, box, max, opts.lang, opts.currency);
  const step = plot.w / (data.length - 1);
  const pts = data.map((d, i) => [plot.x + i * step, plot.y + plot.h - (d.value / top) * plot.h] as const);

  doc.save();
  doc.moveTo(pts[0]![0], plot.y + plot.h);
  pts.forEach(([px, py]) => doc.lineTo(px, py));
  doc.lineTo(pts.at(-1)![0], plot.y + plot.h).closePath();
  const grad = doc.linearGradient(0, plot.y, 0, plot.y + plot.h);
  grad.stop(0, THEME.primary, 0.28).stop(1, THEME.primary, 0.02);
  doc.fill(grad);
  doc.restore();

  doc.save();
  pts.forEach(([px, py], i) => (i === 0 ? doc.moveTo(px, py) : doc.lineTo(px, py)));
  doc.lineWidth(1.4).lineJoin('round').strokeColor(THEME.primary).stroke();
  doc.restore();

  const every = opts.labelEvery ?? Math.max(1, Math.ceil(data.length / 8));
  doc.font(F.regular).fontSize(7).fillColor(THEME.muted);
  data.forEach((d, i) => {
    if (i % every !== 0) return;
    oneLine(doc, d.label, plot.x + i * step - 30, plot.y + plot.h + 5, 60, 'center');
  });
}

/** Horizontal progress bar used inside tables. */
export function shareBar(doc: Doc, x: number, y: number, w: number, pct: number, color: string = THEME.primary) {
  roundedRect(doc, x, y, w, 5, 2.5, THEME.primarySoft);
  if (pct > 0) roundedRect(doc, x, y, Math.max(3, (w * Math.min(pct, 100)) / 100), 5, 2.5, color);
}

export interface Column {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export function tableHeader(
  doc: Doc,
  cols: Column[],
  x: number,
  y: number,
  opts: { fill?: string; color?: string; h?: number } = {},
) {
  const h = opts.h ?? 22;
  const width = cols.reduce((s, c) => s + c.width, 0);
  roundedRect(doc, x, y, width, h, 5, opts.fill ?? THEME.surface);
  doc
    .font(F.bold)
    .fontSize(8)
    .fillColor(opts.color ?? THEME.muted);
  let cx = x;
  for (const c of cols) {
    oneLine(doc, c.header, cx + 8, y + (h - 10) / 2, c.width - 16, c.align);
    cx += c.width;
  }
  return y + h;
}
