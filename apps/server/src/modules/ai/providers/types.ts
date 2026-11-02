import type { LlmProvider } from '@salesreport/shared';

export interface LlmRequest {
  system: string;
  user: string;
  /** Ask the provider for a JSON object response. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmClientConfig {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  timeoutMs: number;
  baseUrl?: string;
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

export type LlmCall = (cfg: LlmClientConfig, req: LlmRequest) => Promise<string>;

/** fetch wrapper with timeout; never includes the API key in thrown messages. */
export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new LlmError(
      err instanceof Error && err.name === 'TimeoutError' ? 'LLM request timed out' : 'LLM request failed',
    );
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = `LLM provider returned HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string };
      const m = typeof j.error === 'string' ? j.error : j.error?.message;
      if (m) msg += `: ${m.slice(0, 200)}`;
    } catch {
      /* ignore */
    }
    throw new LlmError(msg, res.status);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new LlmError('LLM provider returned invalid JSON');
  }
}
