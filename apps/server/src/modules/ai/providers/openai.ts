import { LlmError, postJson, type LlmCall } from './types';

interface ChatResponse {
  choices?: { message?: { content?: string | null } }[];
}

/** OpenAI Chat Completions. Works with any OpenAI-compatible endpoint via OPENAI_BASE_URL. */
export const callOpenAI: LlmCall = async (cfg, req) => {
  const base = (cfg.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const isOfficial = base.startsWith('https://api.openai.com');
  const isReasoning = /^(o\d|gpt-5)/.test(cfg.model);
  const data = (await postJson(
    `${base}/chat/completions`,
    { authorization: `Bearer ${cfg.apiKey}` },
    {
      model: cfg.model,
      // Reasoning models (o-series, gpt-5*) reject a custom temperature.
      ...(isReasoning ? {} : { temperature: req.temperature ?? 0.4 }),
      // api.openai.com uses max_completion_tokens; most compatible servers still expect max_tokens.
      ...(isOfficial ? { max_completion_tokens: req.maxTokens ?? 1500 } : { max_tokens: req.maxTokens ?? 1500 }),
      ...(req.json ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
    },
    cfg.timeoutMs,
  )) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new LlmError('OpenAI returned an empty response');
  return content;
};
