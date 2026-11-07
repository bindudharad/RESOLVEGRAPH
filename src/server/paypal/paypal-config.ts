import 'dotenv/config';
import { z } from 'zod';

export const PayPalConfigSchema = z.object({
  env: z.enum(['sandbox', 'live']).default('sandbox'),
  clientId: z.string().min(1, 'PayPal Client ID is required'),
  clientSecret: z.string().min(1, 'PayPal Client Secret is required'),
  webhookId: z.string().default(''),
  baseUrl: z.string().url().default('https://api-m.sandbox.paypal.com'),
  publicClientId: z.string().default('sb'),
  liveEnabled: z.boolean().default(false),
  disputesEnabled: z.boolean().default(true),
  webhookProcessingEnabled: z.boolean().default(true),
  providerType: z.enum(['rest', 'mock']).default('mock'),
});

export type PayPalConfig = z.infer<typeof PayPalConfigSchema>;

let cachedConfig: PayPalConfig | null = null;

export function getPayPalConfig(): PayPalConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawEnv = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  const liveEnabled = process.env.PAYPAL_LIVE_ENABLED === 'true';

  // Hard safety invariant: live transactions must be explicitly enabled and warned
  if (rawEnv === 'live' && !liveEnabled) {
    console.warn(
      '[ResolveGraph PayPal Safety Block] Attempted to use LIVE PayPal environment with PAYPAL_LIVE_ENABLED=false. Falling back strictly to sandbox.'
    );
  }

  const effectiveEnv = liveEnabled && rawEnv === 'live' ? 'live' : 'sandbox';
  const defaultBaseUrl =
    effectiveEnv === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  const clientId = process.env.PAYPAL_CLIENT_ID || 'mock_paypal_client_id_dev';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || 'mock_paypal_client_secret_dev';

  const isTestOrMock =
    process.env.PAYPAL_PROVIDER === 'mock' ||
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.env.AI_PROVIDER === 'test' ||
    clientId.startsWith('sb_') ||
    clientId.startsWith('mock_') ||
    clientSecret.startsWith('sb_') ||
    clientSecret.startsWith('mock_');

  const defaultProvider = isTestOrMock ? 'mock' : 'rest';
  const providerType = (process.env.PAYPAL_PROVIDER as 'rest' | 'mock') || defaultProvider;

  const parsed = PayPalConfigSchema.parse({
    env: effectiveEnv,
    clientId,
    clientSecret,
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
    baseUrl: process.env.PAYPAL_BASE_URL || defaultBaseUrl,
    publicClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'sb',
    liveEnabled,
    disputesEnabled: process.env.PAYPAL_DISPUTES_ENABLED !== 'false',
    webhookProcessingEnabled: process.env.PAYPAL_WEBHOOK_PROCESSING_ENABLED !== 'false',
    providerType,
  });

  cachedConfig = parsed;
  return parsed;
}

export function resetPayPalConfigForTesting(): void {
  cachedConfig = null;
}
