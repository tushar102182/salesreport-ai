import { LlmError, postJson, type LlmCall } from './types';

interface MessagesResponse {
  content?: { type: string; text?: string }[];
}

/** Anthropic Messages API. */
export const callAnthropic: LlmCall = async (cfg, req) => {
  const data = (await postJson(
    'https://api.anthropic.com/v1/messages',
    { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
    {
      model: cfg.model,
      max_tokens: req.maxTokens ?? 1500,
      temperature: req.temperature ?? 0.4,
      system: req.system + (req.json ? '\nRespond with a single valid JSON object and nothing else.' : ''),
      messages: [{ role: 'user', content: req.user }],
    },
    cfg.timeoutMs,
  )) as MessagesResponse;
  const text = data.content
    ?.filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('');
  if (!text) throw new LlmError('Anthropic returned an empty response');
  return text;
};
