/**
 * RESOLVEGRAPH — Backend-Only Google Gemini Connection Test
 *
 * Verifies GEMINI_API_KEY loading, SDK initialization, minimal text generation
 * against a free-tier model, and response integrity without uploading real
 * customer data or exposing secrets.
 */

import { Logger } from '@/lib/logger';
import {
  assertFreeTierModelAllowed,
  assertGeminiServerContext,
  getGeminiConfig,
  normalizeGeminiModelName,
} from './gemini-config';
import { getGeminiClient, type GeminiClientLike } from './gemini-client';
import {
  GeminiIntegrationError,
  normalizeGeminiError,
  type GeminiErrorCode,
} from './gemini-errors';

export type GeminiConnectionStatusLabel =
  | 'GEMINI CONNECTION: SUCCESS'
  | 'GEMINI CONNECTION: FAILED';

export interface GeminiConnectionTestResult {
  status: GeminiConnectionStatusLabel;
  ok: boolean;
  provider: 'google-gemini';
  freeTierOnly: boolean;
  model: string;
  resolvedModelVersion?: string;
  latencyMs: number;
  responsePreview?: string;
  tokenUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  errorCode?: GeminiErrorCode;
  errorMessage?: string;
  checkedAt: string;
}

export interface RunGeminiConnectionTestOptions {
  model?: string;
  env?: NodeJS.ProcessEnv;
  client?: GeminiClientLike;
}

/**
 * Executes a minimal, synthetic text-generation health check against Gemini.
 * Does not transmit any customer evidence or sensitive data.
 */
export async function runGeminiConnectionTest(
  options?: RunGeminiConnectionTestOptions
): Promise<GeminiConnectionTestResult> {
  const start = Date.now();
  const checkedAt = new Date().toISOString();
  const env = options?.env ?? process.env;

  let selectedModel = normalizeGeminiModelName(
    options?.model?.trim() ||
      env.GEMINI_TEXT_MODEL?.trim() ||
      env.GEMINI_VISION_MODEL?.trim() ||
      'unconfigured'
  );
  let freeTierOnly = (env.GEMINI_FREE_TIER_ONLY || 'true').toLowerCase() !== 'false';

  try {
    assertGeminiServerContext();

    const config = getGeminiConfig(env);
    freeTierOnly = config.freeTierOnly;
    selectedModel = normalizeGeminiModelName(options?.model?.trim() || config.textModel);

    assertFreeTierModelAllowed(selectedModel, config.freeTierOnly);

    const client = options?.client ?? getGeminiClient(env);

    // Keep maxOutputTokens generous enough for Gemini 3.x thinking models to still emit text.
    const response = await client.models.generateContent({
      model: selectedModel,
      contents: 'Connection verification ping. Reply with exact word: OK',
      config: {
        temperature: 0,
        maxOutputTokens: 512,
      },
    });

    const text = typeof response?.text === 'string' ? response.text.trim() : '';
    const finishReason = response?.candidates?.[0]?.finishReason;

    if (!text) {
      throw new GeminiIntegrationError({
        code: 'INVALID_RESPONSE',
        statusCode: 502,
        model: selectedModel,
        isRetryable: false,
        message: `Gemini returned an empty response body (finishReason: ${String(finishReason ?? 'UNKNOWN')}).`,
      });
    }

    const latencyMs = Date.now() - start;
    const tokenUsage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount ?? 0,
          candidatesTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined;

    Logger.info('Gemini backend connection test succeeded', {
      service: 'gemini-connection-test',
      model: selectedModel,
      resolvedModelVersion: response.modelVersion,
      latencyMs,
      freeTierOnly,
    });

    return {
      status: 'GEMINI CONNECTION: SUCCESS',
      ok: true,
      provider: 'google-gemini',
      freeTierOnly,
      model: selectedModel,
      ...(response.modelVersion ? { resolvedModelVersion: response.modelVersion } : {}),
      latencyMs,
      responsePreview: text.slice(0, 32),
      ...(tokenUsage ? { tokenUsage } : {}),
      checkedAt,
    };
  } catch (error: unknown) {
    const normalized = normalizeGeminiError(error, {
      model: selectedModel === 'unconfigured' ? undefined : selectedModel,
    });
    const latencyMs = Date.now() - start;

    Logger.warn('Gemini backend connection test failed', {
      service: 'gemini-connection-test',
      errorCode: normalized.code,
      model: normalized.model ?? selectedModel,
      latencyMs,
      errorMessage: normalized.message,
    });

    return {
      status: 'GEMINI CONNECTION: FAILED',
      ok: false,
      provider: 'google-gemini',
      freeTierOnly,
      model: normalized.model ?? selectedModel,
      latencyMs,
      errorCode: normalized.code,
      errorMessage: normalized.message,
      checkedAt,
    };
  }
}
