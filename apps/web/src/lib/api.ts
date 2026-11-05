import type { ApiErrorBody, AuthResponse } from '@salesreport/shared';

/**
 * Minimal typed API client.
 * - Access token lives only in memory (never localStorage) to limit XSS impact.
 * - Refresh token is an httpOnly cookie; refresh calls send the double-submit CSRF header.
 * - On 401 the client transparently refreshes once and retries.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { path: string; message: string }[] | unknown,
  ) {
    super(message);
  }
}

let accessToken: string | null = null;
let onSessionChange: ((auth: AuthResponse | null) => void) | null = null;
let refreshing: Promise<AuthResponse | null> | null = null;

/** Display currency sent with every request (X-Display-Currency) so server-rendered money matches the UI. */
let displayCurrency: string | null = null;
export const setDisplayCurrencyHeader = (code: string | null) => {
  displayCurrency = code;
};

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const registerSessionListener = (fn: (auth: AuthResponse | null) => void) => {
  onSessionChange = fn;
};

function readCookie(name: string): string | null {
  const m = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

async function getCsrfToken(): Promise<string> {
  const existing = readCookie('__Host-sr_csrf') ?? readCookie('sr_csrf');
  if (existing) return existing;
  const res = await fetch('/api/auth/csrf', { credentials: 'include' });
  const body = (await res.json()) as { csrfToken: string };
  return body.csrfToken;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return new ApiError(res.status, body.error.code, body.error.message, body.error.details);
  } catch {
    return new ApiError(res.status, 'HTTP_ERROR', res.statusText || 'Request failed');
  }
}

/** True when a session might exist (the CSRF cookie is issued together with the refresh cookie). */
export const hasSessionHint = () => Boolean(readCookie('__Host-sr_csrf') ?? readCookie('sr_csrf'));

/** Single-flight refresh. Resolves to the new session or null if not signed in. */
export function refreshSession(): Promise<AuthResponse | null> {
  refreshing ??= (async () => {
    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrf },
      });
      if (!res.ok) {
        setAccessToken(null);
        return null;
      }
      const auth = (await res.json()) as AuthResponse;
      setAccessToken(auth.accessToken);
      return auth;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  form?: FormData;
  signal?: AbortSignal;
}

async function rawRequest(path: string, opts: RequestOptions = {}, retry = true): Promise<Response> {
  const qs = opts.query
    ? `?${new URLSearchParams(
        Object.entries(opts.query)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`
    : '';
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (displayCurrency) headers['X-Display-Currency'] = displayCurrency;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method: opts.method ?? 'GET',
      headers,
      credentials: 'include',
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error');
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const session = await refreshSession();
    if (session) return rawRequest(path, opts, false);
    onSessionChange?.(null);
  }
  if (!res.ok) throw await parseError(res);
  return res;
}

export async function api<T>(path: string, opts?: RequestOptions): Promise<T> {
  const res = await rawRequest(path, opts);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Authenticated file download (PDF/CSV). Keeps the token out of URLs. */
export async function downloadFile(path: string, fallbackName: string, query?: RequestOptions['query']) {
  const res = await rawRequest(path, { query });
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') ?? '';
  const match = cd.match(/filename\*=UTF-8''([^;]+)/);
  const name = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Fetches an authenticated binary (e.g. the logo) as an object URL. */
export async function fetchObjectUrl(path: string): Promise<string | null> {
  try {
    const res = await rawRequest(path);
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

export async function authRequest<T>(path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (path === '/auth/logout') headers['X-CSRF-Token'] = await getCsrfToken();
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await parseError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
