/**
 * RESOLVEGRAPH — Reusable Server-Side Google Gemini SDK Client
 *
 * Provides a single shared @google/genai client instance for server-side
 * operations. Enforces strict server-only access and normalized error handling.
 */

import { createHash } from 'node:crypto';
import {
  GoogleGenAI,
  type DeleteFileParameters,
  type DeleteFileResponse,
  type File as GeminiFile,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type GetFileParameters,
  type ListModelsParameters,
  type Model,
  type Pager,
  type UploadFileParameters,
} from '@google/genai';
import { assertGeminiServerContext, getGeminiConfig, type GeminiConfig } from './gemini-config';
import { normalizeGeminiError } from './gemini-errors';

export interface GeminiClientLike {
  models: {
    generateContent: (params: GenerateContentParameters) => Promise<GenerateContentResponse>;
    list?: (params?: ListModelsParameters) => Promise<Pager<Model>>;
  };
  files?: {
    upload: (params: UploadFileParameters) => Promise<GeminiFile>;
    get: (params: GetFileParameters) => Promise<GeminiFile>;
    delete: (params: DeleteFileParameters) => Promise<DeleteFileResponse>;
  };
}

let cachedClient: GoogleGenAI | null = null;
let cachedConfigFingerprint: string | null = null;
let testingClientOverride: GeminiClientLike | null = null;

function fingerprintConfig(config: GeminiConfig): string {
  return createHash('sha256')
    .update(`${config.apiKey}:${config.requestTimeoutMs}`)
    .digest('hex');
}

/**
 * Returns the singleton server-side GoogleGenAI client instance.
 * Reuses the existing client whenever configuration has not changed.
 */
export function getGeminiClient(env: NodeJS.ProcessEnv = process.env): GeminiClientLike {
  assertGeminiServerContext();

  if (testingClientOverride) {
    return testingClientOverride;
  }

  const config = getGeminiConfig(env);
  const fingerprint = fingerprintConfig(config);

  if (cachedClient && cachedConfigFingerprint === fingerprint) {
    return cachedClient;
  }

  cachedClient = new GoogleGenAI({
    apiKey: config.apiKey,
    httpOptions: {
      timeout: config.requestTimeoutMs,
    },
  });
  cachedConfigFingerprint = fingerprint;

  return cachedClient;
}

/**
 * Executes a Gemini SDK request with consistent error normalization.
 */
export async function executeGeminiCall<T>(
  operation: (client: GeminiClientLike, config: GeminiConfig) => Promise<T>,
  options?: {
    env?: NodeJS.ProcessEnv;
    client?: GeminiClientLike;
    model?: string;
  }
): Promise<T> {
  assertGeminiServerContext();

  const env = options?.env ?? process.env;
  const config = getGeminiConfig(env);
  const client = options?.client ?? getGeminiClient(env);

  try {
    return await operation(client, config);
  } catch (error: unknown) {
    throw normalizeGeminiError(error, { model: options?.model });
  }
}

/**
 * Injects a mock client for unit tests. Never used in production runtime.
 */
export function setGeminiClientForTesting(client: GeminiClientLike | null): void {
  testingClientOverride = client;
}

/**
 * Clears the cached singleton client (primarily for test isolation).
 */
export function resetGeminiClientForTesting(): void {
  cachedClient = null;
  cachedConfigFingerprint = null;
  testingClientOverride = null;
}
