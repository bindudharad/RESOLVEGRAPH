import { AIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { TestAIProvider } from './test.provider';

let cachedProvider: AIProvider | null = null;

export function isAIProcessingEnabled(): boolean {
  return process.env.AI_PROCESSING_ENABLED === 'true';
}

export function getAIProvider(forceTest = false): AIProvider {
  if (forceTest) {
    return new TestAIProvider();
  }

  if (cachedProvider) {
    return cachedProvider;
  }

  const requestedProvider = (process.env.AI_PROVIDER || 'test').toLowerCase();

  if (requestedProvider === 'openai') {
    // If no key configured, fall back to Test provider with warning
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
