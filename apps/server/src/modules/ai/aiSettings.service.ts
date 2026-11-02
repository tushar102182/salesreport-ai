import { DEFAULT_LLM_MODELS, type AiSettingsDto, type AiSettingsInput, type LlmProvider } from '@salesreport/shared';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { decryptSecret, encryptSecret, maskSecret } from '../../lib/crypto';
import { forbidden } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { PROVIDERS, type LlmClientConfig } from './providers';

const envKeyFor = (p: LlmProvider) =>
  p === 'openai' ? env.OPENAI_API_KEY : p === 'gemini' ? env.GEMINI_API_KEY : env.ANTHROPIC_API_KEY;

interface Resolved {
  config: LlmClientConfig | null;
  source: 'organization' | 'environment' | 'none';
}

/**
 * Resolves the LLM configuration for an organization.
 * Priority: organization override (Settings → AI) → environment (.env) → none (rule-based fallback).
 */
export async function resolveLlmConfig(organizationId: string): Promise<Resolved> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { llmProvider: true, llmModel: true, llmApiKeyEnc: true },
  });
  const orgProvider = org?.llmProvider as LlmProvider | null | undefined;
  if (orgProvider && PROVIDERS[orgProvider]) {
    let key: string | undefined;
    if (org?.llmApiKeyEnc) {
      try {
        key = decryptSecret(org.llmApiKeyEnc, organizationId);
      } catch {
        logger.error({ organizationId }, 'could not decrypt stored LLM key (ENCRYPTION_KEY changed?)');
      }
    }
    key ??= envKeyFor(orgProvider);
    if (key) {
      return {
        source: 'organization',
        config: {
          provider: orgProvider,
          model: org?.llmModel || DEFAULT_LLM_MODELS[orgProvider],
          apiKey: key,
          timeoutMs: env.LLM_TIMEOUT_MS,
          baseUrl: orgProvider === 'openai' ? env.OPENAI_BASE_URL : undefined,
        },
      };
    }
  }
  if (env.LLM_PROVIDER !== 'none') {
    const key = envKeyFor(env.LLM_PROVIDER);
    if (key) {
      return {
        source: 'environment',
        config: {
          provider: env.LLM_PROVIDER,
          model: env.LLM_MODEL || DEFAULT_LLM_MODELS[env.LLM_PROVIDER],
          apiKey: key,
          timeoutMs: env.LLM_TIMEOUT_MS,
          baseUrl: env.LLM_PROVIDER === 'openai' ? env.OPENAI_BASE_URL : undefined,
        },
      };
    }
  }
  return { source: 'none', config: null };
}

export async function getAiSettings(organizationId: string): Promise<AiSettingsDto> {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { llmProvider: true, llmModel: true, llmApiKeyEnc: true },
  });
  let masked: string | null = null;
  if (org.llmApiKeyEnc) {
    try {
      masked = maskSecret(decryptSecret(org.llmApiKeyEnc, organizationId));
    } catch {
      masked = '•••••••• (unreadable)';
    }
  }
  const { config, source } = await resolveLlmConfig(organizationId);
  return {
    provider: (org.llmProvider as LlmProvider | null) ?? null,
    model: org.llmModel,
    apiKeyMasked: masked,
    hasOrgKey: Boolean(org.llmApiKeyEnc),
    effective: { provider: config?.provider ?? 'rule-based', model: config?.model ?? null, source },
    demoMode: env.DEMO_MODE,
  };
}

export async function updateAiSettings(organizationId: string, input: AiSettingsInput) {
  if (env.DEMO_MODE && input.apiKey) throw forbidden('Saving API keys is disabled in the public demo');
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      llmProvider: input.provider,
      llmModel: input.model || null,
      ...(input.apiKey ? { llmApiKeyEnc: encryptSecret(input.apiKey, organizationId) } : {}),
    },
  });
  return getAiSettings(organizationId);
}

export async function deleteAiKey(organizationId: string) {
  await prisma.organization.update({ where: { id: organizationId }, data: { llmApiKeyEnc: null } });
  return getAiSettings(organizationId);
}

/** Sends a tiny prompt to verify the effective provider/key works. */
export async function testAiConnection(organizationId: string) {
  const { config } = await resolveLlmConfig(organizationId);
  if (!config)
    return {
      ok: false,
      provider: 'rule-based',
      message: 'No API key configured — using the built-in rule-based summary.',
    };
  const started = Date.now();
  try {
    await PROVIDERS[config.provider](
      { ...config, timeoutMs: Math.min(config.timeoutMs, 20_000) },
      { system: 'You are a health check.', user: 'Reply with the single word: OK', maxTokens: 300 },
    );
    return {
      ok: true,
      provider: config.provider,
      model: config.model,
      latencyMs: Date.now() - started,
      message: 'Connection successful',
    };
  } catch (err) {
    return {
      ok: false,
      provider: config.provider,
      model: config.model,
      message: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}
