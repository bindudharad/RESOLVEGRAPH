/**
 * RESOLVEGRAPH — Gemini Backend Connection Verification Script
 *
 * Usage:
 *   npx tsx scripts/test-gemini.ts
 *   npx tsx scripts/test-gemini.ts --model=gemini-3.5-flash-lite
 */

import { loadEnvConfig } from '@next/env';
import { getSafeGeminiConfigSummary, runGeminiConnectionTest } from '../src/server/ai/gemini';

async function main() {
  const isDev = process.env.NODE_ENV !== 'production';
  loadEnvConfig(process.cwd(), isDev, {
    info: () => {},
    error: () => {},
  });

  const modelArg = process.argv.find((arg) => arg.startsWith('--model='));
  const model = modelArg ? modelArg.slice('--model='.length).trim() : undefined;

  const configSummary = getSafeGeminiConfigSummary();
  const result = await runGeminiConnectionTest({ model });

  console.log(result.status);
  console.log(
    JSON.stringify(
      {
        ok: result.ok,
        provider: result.provider,
        freeTierOnly: result.freeTierOnly,
        configuredModels: configSummary.models,
        testedModel: result.model,
        resolvedModelVersion: result.resolvedModelVersion,
        latencyMs: result.latencyMs,
        tokenUsage: result.tokenUsage,
        responsePreview: result.responsePreview,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        checkedAt: result.checkedAt,
      },
      null,
      2
    )
  );

  process.exit(result.ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error('GEMINI CONNECTION: FAILED');
  console.error(err instanceof Error ? err.message : 'Unexpected failure running Gemini test.');
  process.exit(1);
});
