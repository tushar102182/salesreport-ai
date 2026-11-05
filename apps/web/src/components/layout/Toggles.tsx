import type { ReactNode } from 'react';
import { ChevronDown, Coins, Languages, Moon, Sun } from 'lucide-react';
import { CURRENCIES, getCurrency } from '@salesreport/shared';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../lib/theme';
import { useCurrency } from '../../lib/currency';
import { cn } from '../../lib/cn';
import { LANGUAGE_LABELS, resolveAppLanguage, SUPPORTED_LANGUAGES } from '../../i18n';

/**
 * A compact pill that shows the current value and opens a native <select> (overlaid, invisible)
 * so the full list stays accessible and works the same on mobile.
 */
function PillSelect({
  icon,
  label,
  short,
  full,
  value,
  onChange,
  testId,
  title,
  className,
  children,
}: {
  icon: ReactNode;
  label: string;
  short: string;
  full: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  title?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label
      title={title ?? label}
      className={cn(
        'relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 focus-within:ring-2 focus-within:ring-brand-500 hover:border-slate-300 sm:px-3 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
        className,
      )}
    >
      <span className="text-slate-400" aria-hidden>
        {icon}
      </span>
      <span className="sm:hidden" aria-hidden>
        {short}
      </span>
      <span className="hidden whitespace-nowrap sm:inline" aria-hidden>
        {full}
      </span>
      <ChevronDown className="size-3 text-slate-400" aria-hidden />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        data-testid={testId}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {children}
      </select>
    </label>
  );
}

export function LanguageToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const lang = resolveAppLanguage(i18n.resolvedLanguage);
  return (
    <PillSelect
      icon={<Languages className="size-3.5" />}
      label={t('common.language')}
      short={lang.toUpperCase()}
      full={LANGUAGE_LABELS[lang]}
      value={lang}
      onChange={(v) => void i18n.changeLanguage(v)}
      testId="language-switcher"
      className={className}
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l} value={l} className="text-slate-900">
          {LANGUAGE_LABELS[l]}
        </option>
      ))}
    </PillSelect>
  );
}

/** Global display-currency switcher (top bar + settings). Converts every amount in the app. */
export function CurrencyToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { currency, setCurrency, fx } = useCurrency();
  const info = getCurrency(currency);
  return (
    <PillSelect
      icon={<Coins className="size-3.5" />}
      label={t('common.displayCurrency')}
      title={`${t('common.displayCurrency')} — ${t('common.approxRates', { date: fx.asOf })}`}
      short={currency}
      full={`${currency} ${info.symbol.trim() !== currency ? info.symbol.trim() : ''}`.trim()}
      value={currency}
      onChange={setCurrency}
      testId="currency-switcher"
      className={className}
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code} className="text-slate-900">
          {c.code} — {c.name}
        </option>
      ))}
    </PillSelect>
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  return (
    <button
      onClick={toggle}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
      aria-label={`${t('common.theme')}: ${theme === 'dark' ? t('common.dark') : t('common.light')}`}
      title={theme === 'dark' ? t('common.light') : t('common.dark')}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
