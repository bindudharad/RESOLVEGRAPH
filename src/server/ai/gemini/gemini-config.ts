/**
 * RESOLVEGRAPH — Google Gemini Server-Side Configuration
 *
 * Centralizes server-only environment loading and model selection for the
 * upcoming Buyer Evidence Verification Engine.
 *
 * Security & Cost Guarantees:
 * - Reads GEMINI_API_KEY exclusively on the server (never NEXT_PUBLIC_GEMINI_API_KEY).
 * - Never logs, returns, or serializes the API key.
 * - Free-Tier Only by default: never automatically upgrades or falls back to paid models.
 */

import { GeminiIntegrationError } from './gemini-errors';

/**
 * Verified free-tier Flash models empirically confirmed against Google AI Studio:
 * - gemini-3.6-flash: Verified for text, image, video, and structured JSON.
 * - gemini-3.5-flash-lite: Verified for text, image, and video.
 * - gemini-3.1-flash-lite: Verified for text.
 */
export const DEFAULT_GEMINI_VISION_MODEL = 'gemini-3.6-flash';
export const DEFAULT_GEMINI_VIDEO_MODEL = 'gemini-3.6-flash';
export const DEFAULT_GEMINI_TEXT_MODEL = 'gemini-3.6-flash';

export const DEFAULT_GEMINI_TIMEOUT_MS = 25_000;

/**
 * Known non-free / paid-tier or specialized generation models that must not be
 * used automatically when freeTierOnly is enforced.
 */
const BLOCKED_PAID_MODEL_PATTERNS = [
  /^gemini-\d+(?:\.\d+)?-pro(?:-|$)/i,
  /^gemini-\d+(?:\.\d+)?-ultra(?:-|$)/i,
  /^gemini-4-/i,
  /^imagen-/i,
  /^veo-/i,
];

export interface GeminiConfig {
  apiKey: string;
  textModel: string;
  visionModel: string;
  videoModel: string;
  freeTierOnly: boolean;
  requestTimeoutMs: number;
}

export interface SafeGeminiConfigSummary {
  configured: boolean;
  freeTierOnly: boolean;
  models: {
    text: string;
    vision: string;
    video: string;
  };
  missingVariables: string[];
  securityViolation?: string;
}

/**
 * Runtime guard preventing accidental client-bundle / browser execution.
 */
export function assertGeminiServerContext(): void {
  if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    throw new GeminiIntegrationError({
      code: 'CLIENT_CONTEXT_FORBIDDEN',
      statusCode: 500,
      isRetryable: false,
      message: 'Gemini integration modules are strictly server-only and cannot run in a browser context.',
    });
  }
}

/**
 * Normalizes a model identifier (strips optional "models/" prefix).
 */
export function normalizeGeminiModelName(rawModel: string): string {
  return rawModel.trim().replace(/^models\//i, '');
}

/**
 * Enforces the Free Tier Only model policy: never upgrades or falls back to paid models.
 */
export function assertFreeTierModelAllowed(model: string, freeTierOnly = true): void {
  const normalized = normalizeGeminiModelName(model);
  if (!normalized) {
    throw new GeminiIntegrationError({
      code: 'UNSUPPORTED_MODEL',
      statusCode: 400,
      isRetryable: false,
      message: 'Gemini model name cannot be empty.',
    });
  }

  if (freeTierOnly && BLOCKED_PAID_MODEL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new GeminiIntegrationError({
      code: 'PAID_MODEL_BLOCKED',
      statusCode: 403,
      model: normalized,
      isRetryable: false,
      message: `Model "${normalized}" is blocked under GEMINI_FREE_TIER_ONLY policy. Paid models are disabled and will not be used automatically.`,
    });
  }
}

function parseTimeoutMs(rawTimeout: string | undefined): number {
  if (!rawTimeout) return DEFAULT_GEMINI_TIMEOUT_MS;
  const parsed = Number(rawTimeout);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_GEMINI_TIMEOUT_MS;
  }
  return Math.min(120_000, Math.round(parsed));
}

/**
 * Resolves configured Gemini model names without requiring the API key yet.
 */
export function resolveGeminiModelConfig(env: NodeJS.ProcessEnv = process.env): {
  textModel: string;
  visionModel: string;
  videoModel: string;
  freeTierOnly: boolean;
} {
  assertGeminiServerContext();

  const freeTierOnly = (env.GEMINI_FREE_TIER_ONLY || 'true').toLowerCase() !== 'false';
  const visionModel = normalizeGeminiModelName(
    env.GEMINI_VISION_MODEL?.trim() || DEFAULT_GEMINI_VISION_MODEL
  );
  const videoModel = normalizeGeminiModelName(
    env.GEMINI_VIDEO_MODEL?.trim() || DEFAULT_GEMINI_VIDEO_MODEL
  );
  const textModel = normalizeGeminiModelName(
    env.GEMINI_TEXT_MODEL?.trim() || visionModel || DEFAULT_GEMINI_TEXT_MODEL
  );

  assertFreeTierModelAllowed(visionModel, freeTierOnly);
  assertFreeTierModelAllowed(videoModel, freeTierOnly);
  assertFreeTierModelAllowed(textModel, freeTierOnly);

  return {
    textModel,
    visionModel,
    videoModel,
    freeTierOnly,
  };
}

/**
 * Loads full server-side Gemini configuration and requires GEMINI_API_KEY.
 */
export function getGeminiConfig(env: NodeJS.ProcessEnv = process.env): GeminiConfig {
  assertGeminiServerContext();

  const apiKey = env.GEMINI_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new GeminiIntegrationError({
      code: 'MISSING_API_KEY',
      statusCode: 503,
      isRetryable: false,
      message:
        'Gemini configuration error: GEMINI_API_KEY is not set in server environment variables. Configure GEMINI_API_KEY in .env.local (never NEXT_PUBLIC_GEMINI_API_KEY).',
    });
  }

  const models = resolveGeminiModelConfig(env);

  return {
    apiKey,
    ...models,
    requestTimeoutMs: parseTimeoutMs(env.GEMINI_TIMEOUT_MS),
  };
}

/**
 * Returns a safe, non-secret diagnostic summary suitable for logs and admin health endpoints.
 */
export function getSafeGeminiConfigSummary(
  env: NodeJS.ProcessEnv = process.env
): SafeGeminiConfigSummary {
  assertGeminiServerContext();

  const hasApiKey = Boolean(env.GEMINI_API_KEY?.trim());
  const freeTierOnly = (env.GEMINI_FREE_TIER_ONLY || 'true').toLowerCase() !== 'false';
  const visionModel = normalizeGeminiModelName(
    env.GEMINI_VISION_MODEL?.trim() || DEFAULT_GEMINI_VISION_MODEL
  );
  const videoModel = normalizeGeminiModelName(
    env.GEMINI_VIDEO_MODEL?.trim() || DEFAULT_GEMINI_VIDEO_MODEL
  );
  const textModel = normalizeGeminiModelName(
    env.GEMINI_TEXT_MODEL?.trim() || visionModel || DEFAULT_GEMINI_TEXT_MODEL
  );

  const missingVariables: string[] = [];
  if (!hasApiKey) {
    missingVariables.push('GEMINI_API_KEY');
  }

  const securityViolation = env.NEXT_PUBLIC_GEMINI_API_KEY
    ? 'NEXT_PUBLIC_GEMINI_API_KEY is set and must be removed immediately to avoid browser bundle exposure.'
    : undefined;

  return {
    configured: hasApiKey && !securityViolation,
    freeTierOnly,
    models: {
      text: textModel,
      vision: visionModel,
      video: videoModel,
    },
    missingVariables,
    ...(securityViolation ? { securityViolation } : {}),
  };
}
