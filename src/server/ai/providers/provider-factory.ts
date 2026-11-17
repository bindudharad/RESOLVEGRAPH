import { AIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { GeminiAIProvider } from './gemini.provider';
import { TestAIProvider } from './test.provider';

let cachedProvider: AIProvider | null = null;

export function isAIProcessingEnabled(): boolean {
  return process.env.AI_PROCESSING_ENABLED === 'true';
}

export type AIRuntimeMode = 'LIVE_AI' | 'DETERMINISTIC' | 'TEST_MOCK' | 'DISABLED' | 'DEGRADED';

export function getAIRuntimeMode(): AIRuntimeMode {
  if (!isAIProcessingEnabled()) {
    return 'DISABLED';
  }

  const requestedProvider = (process.env.AI_PROVIDER || 'test').toLowerCase();
  if (requestedProvider === 'mock' || process.env.NODE_ENV === 'test') {
    return 'TEST_MOCK';
  }

  if (requestedProvider === 'gemini' || requestedProvider === 'google') {
    return process.env.GEMINI_API_KEY ? 'LIVE_AI' : 'DETERMINISTIC';
  }

  if (requestedProvider === 'openai') {
    return process.env.OPENAI_API_KEY ? 'LIVE_AI' : 'DETERMINISTIC';
  }

  return 'DETERMINISTIC';
}

export function getAIProvider(forceTest = false): AIProvider {
  if (forceTest) {
    return new TestAIProvider();
  }

  if (cachedProvider) {
    return cachedProvider;
  }

  const requestedProvider = (process.env.AI_PROVIDER || 'test').toLowerCase();

  if (requestedProvider === 'gemini' || requestedProvider === 'google') {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[AI Provider Factory] GEMINI_API_KEY is not set. Falling back to TestAIProvider.');
      cachedProvider = new TestAIProvider();
      return cachedProvider;
    }
    cachedProvider = new GeminiAIProvider();
    return cachedProvider;
  }

  if (requestedProvider === 'openai') {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('[AI Provider Factory] OPENAI_API_KEY is not set. Falling back to TestAIProvider.');
      cachedProvider = new TestAIProvider();
      return cachedProvider;
    }
    cachedProvider = new OpenAIProvider();
    return cachedProvider;
  }

  // Default to deterministic TestAIProvider
  cachedProvider = new TestAIProvider();
  return cachedProvider;
}

export function resetProviderCache(): void {
  cachedProvider = null;
}
