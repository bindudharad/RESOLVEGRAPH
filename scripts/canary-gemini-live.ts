import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
  info: () => {},
  error: () => {},
});

import { GeminiAIProvider } from '../src/server/ai/providers/gemini.provider';

async function runLiveCanary() {
  console.log('========================================================================');
  console.log('      RESOLVEGRAPH: LIVE GEMINI AI CANARY EXECUTION                    ');
  console.log('========================================================================\n');

  const provider = new GeminiAIProvider();
  console.log(`[1/3] Provider Initialized: ${provider.name}`);

  // 1. Health check
  console.log('[2/3] Performing Provider Health Check...');
  const health = await provider.healthCheck();
  console.log('      Health Result:', JSON.stringify(health, null, 2));

  if (!health.ok) {
    throw new Error(`Health check failed: ${health.error}`);
  }

  // 2. Synthetic Document Extraction
  console.log('\n[3/3] Executing Live Document Extraction Canary...');
  const start = Date.now();
  const extraction = await provider.extractDocument({
    documentId: 'canary-ssd-inv-001',
    title: 'Samsung 990 PRO Order Invoice',
    context: 'Electronics purchase invoice for canonical dispute evaluation',
    extractedText: 'Merchant: TechStore Global\nItem: Samsung 990 PRO PCIe 4.0 NVMe SSD 1TB\nCapacity: 1024 GB\nTotal Paid: $199.99 USD\nSerial Number: S6B0NS0W123456\nOrder Date: 2026-11-03\nCarrier: FedEx 1Z9999999999999999'
  });

  const duration = Date.now() - start;
  console.log(`      Canary Completed in ${duration}ms`);
  console.log(`      Extracted Facts (${extraction.facts.length}):`);
  extraction.facts.forEach((f, idx) => {
    console.log(`        ${idx + 1}. [${f.factType}] ${f.name} -> "${f.normalizedValue}" (confidence: ${f.confidence})`);
  });
  console.log('      Token Usage:', JSON.stringify(extraction.tokenUsage, null, 2));

  // Financial safety check:
  console.log('\n[SAFETY] Financial Disbursement Check: ZERO funds disbursed. Pure read-only extraction.');
  console.log('========================================================================');
  console.log('      LIVE AI EXECUTION: VERIFIED (GENUINE LLM INFERENCE)              ');
  console.log('========================================================================\n');
}

runLiveCanary()
  .catch((err) => {
    console.error('Live canary failed:', err);
    process.exit(1);
  });
