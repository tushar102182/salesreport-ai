import { useTranslation } from 'react-i18next';
import {
  compactNumber,
  formatDate,
  formatMoney,
  formatMonthKey,
  formatNumber,
  formatPercent,
  WEEKDAYS,
  type Language,
} from '@salesreport/shared';

/** Locale-aware formatters bound to the current UI language (Bangla digits in bn). */
export function useFormat() {
  const { i18n } = useTranslation();
  const lang: Language = i18n.resolvedLanguage?.startsWith('bn') ? 'bn' : 'en';
  return {
    lang,
    money: (n: number, currency: string) => formatMoney(n, currency, lang),
    number: (n: number, decimals?: number) => formatNumber(n, lang, { decimals }),
    compact: (n: number, currency = 'BDT') => compactNumber(n, lang, currency),
    percent: (n: number | null) => formatPercent(n, lang),
    date: (d: string | Date | null | undefined) => (d ? formatDate(d, lang) : '—'),
    month: (key: string, long = false) => formatMonthKey(key, lang, long),
    weekday: (i: number) => WEEKDAYS[lang][i] ?? '',
  };
}

/** Translates zod issue messages (which are i18n keys) to the current language. */
export function useFieldError() {
  const { t } = useTranslation();
  return (message?: string) => (message ? t(`validation.${message}`, { defaultValue: message }) : undefined);
}
