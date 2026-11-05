import type { Organization } from '@prisma/client';
import {
  formatDate,
  formatMoney,
  formatMonthKey,
  formatNumber,
  formatPercent,
  toBanglaDigits,
  WEEKDAYS,
  type AiSummary,
  type Analytics,
  type DatasetDto,
  type Language,
} from '@salesreport/shared';
import {
  contentWidth,
  createDoc,
  drawFooters,
  drawLogo,
  ensureSpace,
  F,
  roundedRect,
  sectionTitle,
  type Doc,
} from './base';
import { barChart, kpiGrid, lineChart, oneLine, shareBar, tableHeader, truncate, type Column } from './draw';
import { pdfStrings } from './i18n';
import { fxAsOfText, fxNoteText, type PdfFxNote } from './fx';
import { THEME } from './theme';

interface ReportInput {
  org: Organization;
  dataset: DatasetDto;
  analytics: Analytics;
  summary: AiSummary;
  lang: Language;
  /** Present when amounts were converted to a display currency. */
  fx?: PdfFxNote;
}

function header(doc: Doc, input: ReportInput, t: ReturnType<typeof pdfStrings>) {
  const { org, dataset, analytics: a, lang } = input;
  const x = doc.page.margins.left;
  const w = contentWidth(doc);
  const top = 0;
  const h = 128;

  const grad = doc.linearGradient(0, top, doc.page.width, h);
  grad.stop(0, THEME.primaryDark).stop(1, THEME.primary);
  doc.save().rect(0, top, doc.page.width, h).fill(grad).restore();
  // decorative circles
  doc
    .save()
    .circle(doc.page.width - 40, 10, 80)
    .fillOpacity(0.08)
    .fill(THEME.white)
    .restore();
  doc
    .save()
    .circle(doc.page.width - 140, h + 10, 50)
    .fillOpacity(0.06)
    .fill(THEME.white)
    .restore();

  let textX = x;
  if (org.logo) {
    roundedRect(doc, x, 30, 56, 56, 10, THEME.white);
    if (drawLogo(doc, org.logo, x + 6, 36, 44, 44)) textX = x + 70;
  }
  doc.font(F.bold).fontSize(18).fillColor(THEME.white);
  oneLine(doc, org.name, textX, 32, w * 0.55 - (textX - x));
  doc.font(F.regular).fontSize(8.5).fillColor('#E0E7FF');
  const contact = [org.address, org.phone, org.email].filter(Boolean).join('  •  ');
  if (contact) doc.text(truncate(doc, contact, w * 0.55 - (textX - x)), textX, 58, { lineBreak: false });
  if (org.taxId) doc.text(`${t.taxId}: ${org.taxId}`, textX, 72, { lineBreak: false });

  const rx = x + w * 0.58;
  const rw = w * 0.42;
  doc
    .font(F.bold)
    .fontSize(20)
    .fillColor(THEME.white)
    .text(t.salesReport, rx, 28, { width: rw, align: 'right', lineBreak: false });
  doc.font(F.regular).fontSize(9).fillColor('#E0E7FF');
  oneLine(doc, dataset.name, rx, 58, rw, 'right');
  const period = `${a.periodStart ? formatDate(a.periodStart, lang) : '—'} – ${a.periodEnd ? formatDate(a.periodEnd, lang) : '—'}`;
  oneLine(doc, `${t.period}: ${period}`, rx, 72, rw, 'right');
  oneLine(doc, `${t.generatedOn}: ${formatDate(new Date(), lang)}`, rx, 86, rw, 'right');
  oneLine(
    doc,
    input.fx
      ? `${t.currency}: ${a.currency} · ${t.convertedFrom} ${input.fx.from} · ${fxNoteText(input.fx, a.currency, lang)} (${fxAsOfText(input.fx, lang)})`
      : `${t.currency}: ${a.currency}`,
    x + w * 0.3,
    100,
    w * 0.7,
    'right',
  );

  doc.y = h + 22;
  doc.x = x;
}

export async function renderReportPdf(input: ReportInput): Promise<Buffer> {
  const { org, analytics: a, summary, lang } = input;
  const t = pdfStrings(lang);
  const money = (n: number) => formatMoney(n, a.currency, lang);
  const num = (n: number) => formatNumber(n, lang, { decimals: Number.isInteger(n) ? 0 : 1 });
  const { doc, done } = createDoc({ title: `${t.salesReport} — ${input.dataset.name}`, author: org.name, lang });
  const x = doc.page.margins.left;
  const w = contentWidth(doc);

  // ---------- Page 1: header, KPIs, charts ----------
  header(doc, input, t);

  const g = a.monthOverMonthGrowth;
  const y1 = kpiGrid(
    doc,
    [
      { label: t.totalRevenue, value: money(a.totalRevenue), sub: `${num(a.uniqueProducts)} ${t.products}` },
      {
        label: t.orders,
        value: num(a.orderCount),
        sub: a.uniqueCustomers ? `${num(a.uniqueCustomers)} ${t.customers}` : undefined,
      },
      { label: t.avgOrderValue, value: money(a.averageOrderValue) },
      { label: t.unitsSold, value: num(a.totalQuantity) },
      {
        label: t.bestProduct,
        value: a.bestProductByRevenue?.product ?? '—',
        sub: a.bestProductByRevenue ? money(a.bestProductByRevenue.revenue) : undefined,
      },
      {
        label: t.bestDay,
        value: a.bestWeekday ? WEEKDAYS[lang][a.bestWeekday.weekday]! : '—',
        sub: a.bestWeekday ? money(a.bestWeekday.revenue) : undefined,
      },
      {
        label: t.bestDate,
        value: a.bestDate ? formatDate(a.bestDate.date, lang) : '—',
        sub: a.bestDate ? money(a.bestDate.revenue) : undefined,
      },
      {
        label: t.growth,
        value: formatPercent(g, lang),
        sub: t.vsPrevMonth,
        tone: g === null ? 'default' : g >= 0 ? 'success' : 'danger',
      },
    ],
    x,
    doc.y,
    w,
  );
  doc.y = y1 + 22;

  // Monthly bar chart
  sectionTitle(doc, t.monthlySales);
  const months = a.monthly.slice(-12).map((m) => ({ label: formatMonthKey(m.month, lang), value: m.revenue }));
  const barTop = doc.y;
  roundedRect(doc, x, barTop, w, 200, 10, THEME.white, THEME.border);
  barChart(doc, { x: x + 10, y: barTop + 18, w: w - 20, h: 174 }, months, {
    lang,
    currency: a.currency,
    showValues: true,
  });
  doc.y = barTop + 200 + 22;
  doc.x = x;

  // Daily trend line chart
  sectionTitle(doc, t.dailyTrend);
  const daily = a.daily.map((d) => ({ label: formatDate(d.date, lang).replace(/\s\S+$/, ''), value: d.revenue }));
  const lineTop = doc.y;
  const chartH = Math.min(200, doc.page.height - lineTop - 76);
  roundedRect(doc, x, lineTop, w, chartH, 10, THEME.white, THEME.border);
  lineChart(doc, { x: x + 10, y: lineTop + 14, w: w - 20, h: chartH - 22 }, daily, { lang, currency: a.currency });

  // ---------- Page 2: AI summary + tables ----------
  doc.addPage();
  sectionTitle(doc, t.aiSummary);
  const badge =
    summary.provider === 'rule-based'
      ? t.ruleBased
      : `${summary.provider}${summary.model ? ` · ${summary.model}` : ''}`;
  doc.font(F.regular).fontSize(7.5);
  const badgeText = `${t.generatedBy}: ${badge}`;
  const bw = doc.widthOfString(badgeText) + 16;
  const sy = doc.y;
  roundedRect(doc, x + w - bw, sy - 25, bw, 16, 8, THEME.primarySoft);
  doc.fillColor(THEME.primaryDark).text(badgeText, x + w - bw + 8, sy - 21.5, { lineBreak: false });

  doc.font(F.bold).fontSize(12.5);
  const hh = doc.heightOfString(summary.headline, { width: w - 28 });
  roundedRect(doc, x, sy, w, hh + 22, 10, THEME.primarySoft);
  doc.fillColor(THEME.primaryDark).text(summary.headline, x + 14, sy + 11, { width: w - 28 });
  doc.y = sy + hh + 22 + 12;
  doc.font(F.regular).fontSize(9.5).fillColor(THEME.text).text(summary.overview, x, doc.y, { width: w, lineGap: 2.5 });
  doc.y += 12;

  const bullets = (title: string, items: string[], color: string) => {
    if (!items.length) return;
    ensureSpace(doc, 60);
    doc.font(F.bold).fontSize(10.5).fillColor(THEME.text).text(title, x, doc.y);
    doc.y += 4;
    for (const item of items) {
      doc.font(F.regular).fontSize(9.2);
      const ih = doc.heightOfString(item, { width: w - 18, lineGap: 2 });
      ensureSpace(doc, ih + 6);
      const by = doc.y;
      doc
        .save()
        .circle(x + 4, by + 6.5, 2.6)
        .fill(color)
        .restore();
      doc.fillColor(THEME.text).text(item, x + 14, by, { width: w - 18, lineGap: 2 });
      doc.y += 4;
    }
    doc.y += 8;
  };
  bullets(t.keyInsights, summary.insights, THEME.primary);
  bullets(t.recommendations, summary.recommendations, THEME.success);

  // Top products table
  ensureSpace(doc, 120);
  doc.y += 6;
  sectionTitle(doc, t.topProducts);
  const cols: Column[] = [
    { header: '#', width: 28, align: 'center' },
    { header: t.product, width: w - 28 - 70 - 105 - 120 },
    { header: t.quantity, width: 70, align: 'right' },
    { header: t.revenue, width: 105, align: 'right' },
    { header: t.share, width: 120 },
  ];
  let ty = tableHeader(doc, cols, x, doc.y);
  a.topProducts.slice(0, 10).forEach((p, i) => {
    if (ty + 22 > doc.page.height - 70) {
      doc.addPage();
      ty = tableHeader(doc, cols, x, doc.page.margins.top);
    }
    if (i % 2 === 1) doc.save().rect(x, ty, w, 22).fill(THEME.surface).restore();
    let cx = x;
    const cy = ty + 6;
    doc
      .font(F.bold)
      .fontSize(8.5)
      .fillColor(i < 3 ? THEME.primary : THEME.muted);
    oneLine(doc, lang === 'bn' ? toBanglaDigits(i + 1) : String(i + 1), cx + 4, cy, cols[0]!.width - 8, 'center');
    cx += cols[0]!.width;
    doc.font(F.regular).fillColor(THEME.text);
    oneLine(doc, p.product, cx + 8, cy, cols[1]!.width - 16);
    cx += cols[1]!.width;
    oneLine(doc, num(p.quantity), cx + 8, cy, cols[2]!.width - 16, 'right');
    cx += cols[2]!.width;
    doc.font(F.bold);
    oneLine(doc, money(p.revenue), cx + 8, cy, cols[3]!.width - 16, 'right');
    cx += cols[3]!.width;
    shareBar(doc, cx + 8, cy + 3, cols[4]!.width - 52, p.share, THEME.chart[i % THEME.chart.length]);
    doc.font(F.regular).fontSize(7.5).fillColor(THEME.muted);
    oneLine(doc, `${formatNumber(p.share, lang, { decimals: 1 })}%`, cx + cols[4]!.width - 42, cy, 36, 'right');
    ty += 22;
  });
  doc.y = ty + 20;
  doc.x = x;

  // Weekday performance + top customers side by side
  ensureSpace(doc, 200);
  const colW = (w - 16) / 2;
  const startY = doc.y;
  sectionTitle(doc, t.weekdayPerformance);
  const maxW = Math.max(...a.byWeekday.map((d) => d.revenue), 1);
  // Show Saturday-first order, common in Bangladesh (week starts Saturday)
  const order = [6, 0, 1, 2, 3, 4, 5];
  let wy = doc.y;
  for (const wd of order) {
    const d = a.byWeekday[wd]!;
    const isBest = a.bestWeekday?.weekday === wd;
    doc
      .font(isBest ? F.bold : F.regular)
      .fontSize(8)
      .fillColor(isBest ? THEME.primary : THEME.text);
    oneLine(doc, WEEKDAYS[lang][wd]!, x, wy + 1, 70);
    shareBar(doc, x + 74, wy + 4, colW - 74 - 70, (d.revenue / maxW) * 100, isBest ? THEME.primary : '#A5B4FC');
    doc.font(F.regular).fontSize(7.5).fillColor(THEME.muted);
    oneLine(doc, money(d.revenue), x + colW - 68, wy + 1, 68, 'right');
    wy += 18;
  }

  if (a.topCustomers.length) {
    const cxStart = x + colW + 16;
    doc.y = startY;
    sectionTitle(doc, t.topCustomers, cxStart);
    const ccols: Column[] = [
      { header: t.customer, width: colW - 50 - 90 },
      { header: t.orders, width: 50, align: 'right' },
      { header: t.revenue, width: 90, align: 'right' },
    ];
    let cy = tableHeader(doc, ccols, cxStart, doc.y, { h: 18 });
    for (const c of a.topCustomers.slice(0, 7)) {
      doc.font(F.regular).fontSize(8).fillColor(THEME.text);
      oneLine(doc, c.customer, cxStart + 8, cy + 4, ccols[0]!.width - 16);
      oneLine(doc, num(c.orders), cxStart + ccols[0]!.width + 4, cy + 4, ccols[1]!.width - 12, 'right');
      doc.font(F.bold);
      oneLine(
        doc,
        money(c.revenue),
        cxStart + ccols[0]!.width + ccols[1]!.width + 4,
        cy + 4,
        ccols[2]!.width - 12,
        'right',
      );
      cy += 18;
    }
    wy = Math.max(wy, cy);
  }
  doc.y = wy + 10;

  drawFooters(doc, `${org.name} · ${t.salesReport}`, lang, t);
  doc.end();
  return done;
}
