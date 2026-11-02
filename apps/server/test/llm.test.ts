import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callOpenAI } from '../src/modules/ai/providers/openai';
import { LlmError } from '../src/modules/ai/providers/types';
import { decryptSecret, encryptSecret, maskSecret } from '../src/lib/crypto';

let server: http.Server;
let baseUrl = '';
let lastBody: Record<string, unknown> = {};

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      lastBody = JSON.parse(raw) as Record<string, unknown>;
      if (req.headers.authorization !== 'Bearer good-key') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Incorrect API key provided' } }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: '{"headline":"ok"}' } }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe('OpenAI-compatible provider', () => {
  it('sends a JSON-mode chat request and returns the content', async () => {
    const out = await callOpenAI(
      { provider: 'openai', model: 'test-model', apiKey: 'good-key', timeoutMs: 5000, baseUrl },
      { system: 'sys', user: 'hello', json: true },
    );
    expect(out).toBe('{"headline":"ok"}');
    expect(lastBody.model).toBe('test-model');
    expect(lastBody.response_format).toEqual({ type: 'json_object' });
    expect((lastBody.messages as unknown[]).length).toBe(2);
  });

  it('surfaces provider errors without leaking the key', async () => {
    const err = await callOpenAI(
      { provider: 'openai', model: 'm', apiKey: 'bad-key-123', timeoutMs: 5000, baseUrl },
      { system: 's', user: 'u' },
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect((err as Error).message).toContain('401');
    expect((err as Error).message).not.toContain('bad-key-123');
  });
});

describe('AES-256-GCM secret encryption', () => {
  it('round-trips, binds to AAD and masks', () => {
    const enc = encryptSecret('sk-secret-value-1234', 'org_1');
    expect(enc).not.toContain('sk-secret');
    expect(decryptSecret(enc, 'org_1')).toBe('sk-secret-value-1234');
    expect(() => decryptSecret(enc, 'org_2')).toThrow();
    expect(maskSecret('sk-secret-value-1234')).toBe('sk-s••••••••1234');
  });
});
