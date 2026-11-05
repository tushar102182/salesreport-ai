import { formatDate, formatNumber, fxRate, type FxRates, type Language } from '@salesreport/shared';
import { pdfStrings } from './i18n';

/** Set when a document's amounts were converted from their source currency. */
export interface PdfFxNote {
  from: string;
  asOf: string;
  rates: FxRates;
}

/** "1 BDT = 0.008035 USD" (the PDF fonts have no ≈ glyph) */
export function fxNoteText(fx: PdfFxNote, to: string, lang: Language): string {
  const r = fxRate(fx.from, to, fx.rates);
  const decimals = r >= 100 ? 2 : r >= 1 ? 4 : 6;
  return `1 ${fx.from} = ${formatNumber(r, lang, { decimals, southAsian: false })} ${to}`;
}

/** "approx., 5 Nov 2026" */
export function fxAsOfText(fx: PdfFxNote, lang: Language): string {
  return `${pdfStrings(lang).approx}, ${formatDate(fx.asOf, lang)}`;
}
