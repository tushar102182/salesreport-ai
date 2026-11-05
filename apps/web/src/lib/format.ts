import { useTranslation } from 'react-i18next';
import {
  compactNumber,
  convertAmount,
  convertAnalytics,
  displayCurrencyFor,
  type Analytics,
  formatDate,
  formatMoney,
  formatMonthKey,
  formatNumber,
  formatPercent,
  WEEKDAYS,
  type Language,
} from '@salesreport/shared';
import { useMemo } from 'react';
import { useCurrency } from './currency';

/**
 * Locale-aware formatters bound to the current UI language (Bangla digits in bn)
 * and the global display currency.
 *
 * `money(amount, sourceCurrency)` is THE way to render an amount: it converts from the
 * amount's own currency to the display currency (approximate rates) and formats it there.
 * Use `moneyExact` only where the user is typing amounts in a specific currency (invoice form).
 */
export function useFormat() {
  const { i18n } = useTranslation();
  const { currency: display, rates } = useCurrency();
  const lang: Language = i18n.resolvedLanguage?.startsWith('bn') ? 'bn' : 'en';
  const to = (from: string) => displayCurrencyFor(from, display, rates);
  return {
    lang,
    /** The display currency chosen in the top bar. */
    currency: display,
    rates,
    money: (n: number, sourceCurrency: string) =>
      formatMoney(convertAmount(n, sourceCurrency, to(sourceCurrency), rates), to(sourceCurrency), lang),
    /** Formats in exactly `currency`, without conversion. */
    moneyExact: (n: number, currency: string) => formatMoney(n, currency, lang),
    /** Converts an amount to the display currency (number only). */
    convert: (n: number, sourceCurrency: string) => convertAmount(n, sourceCurrency, to(sourceCurrency), rates),
    number: (n: number, decimals?: number) => formatNumber(n, lang, { decimals }),
    compact: (n: number, sourceCurrency = display) =>
      compactNumber(convertAmount(n, sourceCurrency, to(sourceCurrency), rates), lang, to(sourceCurrency)),
    percent: (n: number | null) => formatPercent(n, lang),
    date: (d: string | Date | null | undefined) => (d ? formatDate(d, lang) : '—'),
    month: (key: string, long = false) => formatMonthKey(key, lang, long),
    weekday: (i: number) => WEEKDAYS[lang][i] ?? '',
  };
}

/** Analytics with every money field in the display currency (charts, KPIs, tables). */
export function useDisplayAnalytics<T extends Analytics | null | undefined>(a: T): T {
  const { currency, rates } = useCurrency();
  return useMemo(() => (a ? (convertAnalytics(a, currency, rates) as T) : a), [a, currency, rates]);
}

/** Translates zod issue messages (which are i18n keys) to the current language. */
export function useFieldError() {
  const { t } = useTranslation();
  return (message?: string) => (message ? t(`validation.${message}`, { defaultValue: message }) : undefined);
}
