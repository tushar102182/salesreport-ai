import type { LlmProvider } from '@salesreport/shared';
import { callAnthropic } from './anthropic';
import { callGemini } from './gemini';
import { callOpenAI } from './openai';
import type { LlmCall } from './types';

/** Provider registry — add a new provider by implementing `LlmCall` and registering it here. */
export const PROVIDERS: Record<LlmProvider, LlmCall> = {
  openai: callOpenAI,
  gemini: callGemini,
  anthropic: callAnthropic,
};

export * from './types';
