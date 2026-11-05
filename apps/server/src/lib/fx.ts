import type { Request } from 'express';
import { CURRENCY_CODES, mergeFxRates, STATIC_FX_TABLE, type FxTable } from '@salesreport/shared';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Exchange rates for the display-currency feature.
 *
 * The bundled table in @salesreport/shared is always available. When FX_LIVE_RATES is on
 * (default, except in tests) the server refreshes it from FX_RATES_URL — a free, key-less
 * endpoint returning `{ rates: { CODE: unitsPerUSD } }` — at most every 12 hours, and keeps
 * serving the last good table (or the bundled one) when the API is unreachable.
 * Converted amounts are approximate.
 */
const TTL_MS = 12 * 60 * 60 * 1000;
const RETRY_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 4000;

let table: FxTable = STATIC_FX_TABLE;
let nextRefreshAt = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  try {
    const res = await fetch(env.FX_RATES_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { rates?: Record<string, unknown>; time_last_update_unix?: number };
    if (!body.rates || typeof body.rates !== 'object') throw new Error('No rates in response');
    const published =
      typeof body.time_last_update_unix === 'number' ? new Date(body.time_last_update_unix * 1000) : new Date();
    table = {
      base: 'USD',
      rates: mergeFxRates(body.rates),
      source: 'live',
      asOf: published.toISOString().slice(0, 10),
    };
    nextRefreshAt = Date.now() + TTL_MS;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'FX refresh failed — using cached/bundled rates');
    nextRefreshAt = Date.now() + RETRY_MS;
  }
}

/** Current rate table (live when available). Never throws; never blocks longer than the fetch timeout. */
export async function getFxTable(): Promise<FxTable> {
  if (!env.FX_LIVE_RATES || env.isTest) return table;
  if (Date.now() >= nextRefreshAt) {
    inflight ??= refresh().finally(() => (inflight = null));
    await inflight;
  }
  return table;
}

/** Test hook. */
export function setFxTableForTests(t: FxTable) {
  table = t;
}

/**
 * The display currency requested by the client: `?currency=USD` or the
 * `X-Display-Currency` header (sent by the web app on every request). Undefined when absent or unknown.
 */
export function requestedDisplayCurrency(req: Request, fromQuery?: string): string | undefined {
  const raw = (fromQuery ?? req.get('x-display-currency') ?? '').trim().toUpperCase();
  return (CURRENCY_CODES as readonly string[]).includes(raw) ? raw : undefined;
}
