import { LlmError, postJson, type LlmCall } from './types';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

/** Google Gemini generateContent (Generative Language API). */
export const callGemini: LlmCall = async (cfg, req) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`;
  const data = (await postJson(
    url,
    { 'x-goog-api-key': cfg.apiKey },
    {
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: 'user', parts: [{ text: req.user }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.4,
        maxOutputTokens: req.maxTokens ?? 1500,
        ...(req.json ? { responseMimeType: 'application/json' } : {}),
      },
    },
    cfg.timeoutMs,
  )) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new LlmError('Gemini returned an empty response');
  return text;
};
