import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CURRENCY_CODES, STATIC_FX_TABLE, type FxRates, type FxTable, type UserDto } from '@salesreport/shared';
import { api, setDisplayCurrencyHeader } from './api';
import { useAuth } from './auth';
import { useOrganization, usePublicConfig } from './queries';

/**
 * Global display currency.
 *
 * Every amount in the app is stored in its own source currency (a dataset's upload
 * currency, an invoice's currency, the company currency for products). The display
 * currency chosen in the top bar is applied at render time: `useFormat().money(amount, source)`
 * converts with the approximate USD-based rate table from `/api/config/fx` (bundled fallback)
 * and formats in the display currency. The same code is sent to the server as the
 * `X-Display-Currency` header, so dashboard totals, AI summaries and PDFs match the screen.
 *
 * Precedence: localStorage → the signed-in user's saved preference → company currency → BDT.
 */
const STORAGE_KEY = 'sr-currency';
const isSupported = (c: unknown): c is string =>
  typeof c === 'string' && (CURRENCY_CODES as readonly string[]).includes(c);

const readStored = (): string | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isSupported(v) ? v : null;
  } catch {
    return null;
  }
};

interface CurrencyContextValue {
  /** The currency every amount is shown in. */
  currency: string;
  setCurrency: (code: string) => void;
  rates: FxRates;
  fx: FxTable;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { user, status, updateUser } = useAuth();
  const { data: org } = useOrganization();
  const { data: cfg } = usePublicConfig();
  const [stored, setStored] = useState<string | null>(readStored);

  const { data: fx } = useQuery({
    queryKey: ['config', 'fx'],
    queryFn: () => api<FxTable>('/config/fx'),
    staleTime: 60 * 60_000,
    placeholderData: STATIC_FX_TABLE,
  });

  const currency =
    stored ?? (isSupported(user?.displayCurrency) ? user.displayCurrency : null) ?? org?.currency ?? 'BDT';

  // Keep the request header in sync before children render their queries.
  setDisplayCurrencyHeader(status === 'authenticated' ? currency : null);
  useEffect(() => {
    document.documentElement.dataset.currency = currency;
  }, [currency]);

  const setCurrency = useCallback(
    (code: string) => {
      if (!isSupported(code)) return;
      try {
        localStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* private mode: keep it in memory */
      }
      setStored(code);
      setDisplayCurrencyHeader(code);
      // Server-converted data (dashboard totals, summaries) must be refetched in the new currency.
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'config' });
      // Persist on the account so it follows the user to other devices (skipped on the shared public demo).
      if (status === 'authenticated' && !cfg?.demoMode) {
        void api<{ user: UserDto }>('/auth/me/preferences', { method: 'PATCH', body: { displayCurrency: code } })
          .then((r) => updateUser(r.user))
          .catch(() => undefined);
      }
    },
    [qc, status, cfg?.demoMode, updateUser],
  );

  const value = useMemo<CurrencyContextValue>(() => {
    const table = fx ?? STATIC_FX_TABLE;
    return { currency, setCurrency, rates: table.rates, fx: table };
  }, [currency, setCurrency, fx]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

/** Display currency + rates. Outside the provider (e.g. tests) it falls back to BDT and the bundled table. */
export function useCurrency(): CurrencyContextValue {
  return (
    useContext(CurrencyContext) ?? {
      currency: 'BDT',
      setCurrency: () => undefined,
      rates: STATIC_FX_TABLE.rates,
      fx: STATIC_FX_TABLE,
    }
  );
}
