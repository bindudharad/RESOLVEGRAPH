/**
 * RESOLVEGRAPH — Google Gemini Error Handling & Secret Scrubbing
 *
 * Normalizes @google/genai SDK, HTTP, and network errors into safe,
 * understandable domain errors without ever exposing API keys or sensitive payloads.
 */

export type GeminiErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_FAILURE'
  | 'UNSUPPORTED_MODEL'
  | 'PAID_MODEL_BLOCKED'
  | 'CLIENT_CONTEXT_FORBIDDEN'
  | 'PRIVACY_POLICY_BLOCKED'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_ERROR';

const GEMINI_KEY_PATTERN = /AIza[0-9A-Za-z_-]{15,}/g;
const QUERY_KEY_PATTERN = /([?&]key=)[^&\s"']+/gi;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9_.\-]+/gi;

/**
 * Scrubs any accidental API key or authorization token from upstream error strings.
 */
export function sanitizeGeminiErrorText(input: string, maxLength = 320): string {
  if (!input) return '';
  const cleaned = input
    .replace(GEMINI_KEY_PATTERN, '[REDACTED_GEMINI_API_KEY]')
    .replace(QUERY_KEY_PATTERN, '$1[REDACTED_API_KEY]')
    .replace(BEARER_PATTERN, 'Bearer [REDACTED_TOKEN]')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 3)}...`;
}

export interface GeminiSafeErrorPayload {
  error: 'GEMINI_INTEGRATION_ERROR';
  code: GeminiErrorCode;
  message: string;
  statusCode: number;
  model?: string;
  isRetryable: boolean;
}

export class GeminiIntegrationError extends Error {
  public readonly code: GeminiErrorCode;
  public readonly statusCode: number;
  public readonly model?: string;
  public readonly isRetryable: boolean;

  constructor(params: {
    code: GeminiErrorCode;
    message: string;
    statusCode?: number;
    model?: string;
    isRetryable?: boolean;
    cause?: unknown;
  }) {
    super(sanitizeGeminiErrorText(params.message, 500));
    this.name = 'GeminiIntegrationError';
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.model = params.model;
    this.isRetryable =
      params.isRetryable ??
      (params.code === 'RATE_LIMIT_EXCEEDED' ||
        params.code === 'NETWORK_FAILURE' ||
        this.statusCode === 429 ||
        this.statusCode >= 500);

    if (params.cause !== undefined) {
      this.cause = params.cause;
    }
  }

  /**
   * Returns a client-safe, sanitized JSON representation with zero secrets.
   */
  public toSafeResponse(): GeminiSafeErrorPayload {
    return {
      error: 'GEMINI_INTEGRATION_ERROR',
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.model ? { model: this.model } : {}),
      isRetryable: this.isRetryable,
    };
  }
}

function extractNumericStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record.status === 'number' && Number.isFinite(record.status)) {
    return record.status;
  }
  if (typeof record.statusCode === 'number' && Number.isFinite(record.statusCode)) {
    return record.statusCode;
  }
  if (record.response && typeof record.response === 'object') {
    const resp = record.response as Record<string, unknown>;
    if (typeof resp.status === 'number') return resp.status;
  }
  return undefined;
}

function extractErrorCodeString(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const record = error as Record<string, unknown>;
  if (typeof record.code === 'string') return record.code;
  if (record.cause && typeof record.cause === 'object') {
    const causeRecord = record.cause as Record<string, unknown>;
    if (typeof causeRecord.code === 'string') return causeRecord.code;
  }
  return '';
}

function extractUpstreamHint(rawMessage: string): string {
  // Attempt to pull clean error.message when @google/genai embeds a JSON string
  const jsonStart = rawMessage.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(rawMessage.slice(jsonStart)) as {
        error?: { message?: string; status?: string };
      };
      if (parsed?.error?.message) {
        return sanitizeGeminiErrorText(parsed.error.message, 280);
      }
    } catch {
      // Fall through to sanitized raw string
    }
  }
  return sanitizeGeminiErrorText(rawMessage, 280);
}

/**
 * Classifies unknown SDK/HTTP/network failures into understandable GeminiIntegrationError instances.
 */
export function normalizeGeminiError(
  error: unknown,
  context?: { model?: string }
): GeminiIntegrationError {
  if (error instanceof GeminiIntegrationError) {
    return error;
  }

  const model = context?.model;
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown Gemini error');
  const sanitizedDetail = extractUpstreamHint(rawMessage);
  const lower = rawMessage.toLowerCase();
  const status = extractNumericStatus(error);
  const netCode = extractErrorCodeString(error).toUpperCase();
  const errName = error instanceof Error ? error.name : '';

  // 1. Network / timeout failures
  const networkCodes = new Set([
    'ECONNREFUSED',
    'ENOTFOUND',
    'ECONNRESET',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_HEADERS_TIMEOUT',
    'UND_ERR_SOCKET',
  ]);

  if (
    errName === 'AbortError' ||
    networkCodes.has(netCode) ||
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused')
  ) {
    return new GeminiIntegrationError({
      code: 'NETWORK_FAILURE',
      statusCode: 502,
      model,
      isRetryable: true,
      message: `Network failure communicating with Gemini API: ${sanitizedDetail || 'Connection failed or timed out.'}`,
      cause: error,
    });
  }

  // 2. Invalid / unauthorized API key
  if (
    status === 401 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('api key expired') ||
    (status === 403 && (lower.includes('api key') || lower.includes('permission_denied') || lower.includes('unregistered callers')))
  ) {
    return new GeminiIntegrationError({
      code: 'INVALID_API_KEY',
      statusCode: 401,
      model,
      isRetryable: false,
      message: 'Gemini API authentication failed: GEMINI_API_KEY is invalid, expired, or lacks permission.',
      cause: error,
    });
  }

  // 3. Unsupported / deprecated / unavailable model
  if (
    status === 404 ||
    lower.includes('not_found') ||
    lower.includes('no longer available to new users') ||
    lower.includes('is not found for api version') ||
    lower.includes('not supported for generatecontent') ||
    lower.includes('unsupported model')
  ) {
    return new GeminiIntegrationError({
      code: 'UNSUPPORTED_MODEL',
      statusCode: 400,
      model,
      isRetryable: false,
      message: `Selected Gemini model${model ? ` "${model}"` : ''} is unavailable or unsupported on this endpoint/tier. ${sanitizedDetail}`.trim(),
      cause: error,
    });
  }

  // 4. Quota vs Rate-Limit (429 / RESOURCE_EXHAUSTED)
  if (status === 429 || lower.includes('resource_exhausted') || lower.includes('429')) {
    const looksLikeQuota =
      lower.includes('quota') ||
      lower.includes('billing') ||
      lower.includes('limit: 0') ||
      lower.includes('free_tier') ||
      lower.includes('daily');

    if (looksLikeQuota && !lower.includes('rate limit')) {
      return new GeminiIntegrationError({
        code: 'QUOTA_EXCEEDED',
        statusCode: 429,
        model,
        isRetryable: false,
        message: `Gemini Free Tier quota exceeded${model ? ` for model "${model}"` : ''}. Do not switch to paid billing automatically; retry after quota reset or select another available free-tier model.`,
        cause: error,
      });
    }

    return new GeminiIntegrationError({
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      model,
      isRetryable: true,
      message: `Gemini API rate limit exceeded${model ? ` for model "${model}"` : ''}. Wait briefly and retry.`,
      cause: error,
    });
  }

  // 5. High demand / transient unavailability / provider errors
  if (status === 503 || lower.includes('unavailable') || lower.includes('high demand')) {
    return new GeminiIntegrationError({
      code: 'PROVIDER_ERROR',
      statusCode: 503,
      model,
      isRetryable: true,
      message: `Gemini provider temporarily unavailable${model ? ` for model "${model}"` : ''}: ${sanitizedDetail || 'High demand.'}`,
      cause: error,
    });
  }

  return new GeminiIntegrationError({
    code: 'PROVIDER_ERROR',
    statusCode: status && status >= 400 ? status : 502,
    model,
    isRetryable: status !== undefined ? status >= 500 : false,
    message: `Gemini provider error: ${sanitizedDetail || 'Unexpected API failure.'}`,
    cause: error,
  });
}
