import test, { describe, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import type { GenerateContentResponse } from '@google/genai';
import { EnvValidator } from '../src/lib/env-validator';
import {
  DEFAULT_GEMINI_VIDEO_MODEL,
  DEFAULT_GEMINI_VISION_MODEL,
  GeminiEvidenceService,
  GeminiIntegrationError,
  getGeminiClient,
  getGeminiConfig,
  getSafeGeminiConfigSummary,
  normalizeGeminiError,
  resetGeminiClientForTesting,
  runGeminiConnectionTest,
  setGeminiClientForTesting,
  type GeminiClientLike,
} from '../src/server/ai/gemini';
import { GET as geminiHealthGET, POST as geminiHealthPOST } from '../src/app/api/ai/gemini/health/route';

function makeMockResponse(text: string | undefined, finishReason = 'STOP'): GenerateContentResponse {
  return {
    text,
    modelVersion: 'gemini-3.6-flash',
    candidates: [{ finishReason } as NonNullable<GenerateContentResponse['candidates']>[number]],
    usageMetadata: {
      promptTokenCount: 12,
      candidatesTokenCount: 8,
      totalTokenCount: 20,
    },
  } as GenerateContentResponse;
}

function buildNextRequest(url: string, options?: { method?: string; demoEmail?: string; body?: unknown }): NextRequest {
  const headers = new Headers();
  if (options?.demoEmail) {
    headers.set('x-demo-user-email', options.demoEmail);
  }
  if (options?.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: options?.method ?? 'GET',
    headers,
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

function collectFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFilesRecursive(full));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('RESOLVEGRAPH Gemini Integration & Security Suite', () => {
  afterEach(() => {
    resetGeminiClientForTesting();
  });

  test('loads GEMINI_API_KEY and configurable vision/video models on the server only', () => {
    const config = getGeminiConfig({
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'AIzaSyTestOnlySyntheticKeyValue123456',
      GEMINI_VISION_MODEL: 'gemini-3.5-flash-lite',
      GEMINI_VIDEO_MODEL: 'gemini-3.6-flash',
    });

    assert.equal(config.apiKey, 'AIzaSyTestOnlySyntheticKeyValue123456');
    assert.equal(config.visionModel, 'gemini-3.5-flash-lite');
    assert.equal(config.videoModel, 'gemini-3.6-flash');
    assert.equal(config.textModel, 'gemini-3.5-flash-lite');
    assert.equal(config.freeTierOnly, true);

    const defaults = getGeminiConfig({
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'AIzaSyTestOnlySyntheticKeyValue123456',
    });
    assert.equal(defaults.visionModel, DEFAULT_GEMINI_VISION_MODEL);
    assert.equal(defaults.videoModel, DEFAULT_GEMINI_VIDEO_MODEL);
  });

  test('throws clear MISSING_API_KEY error and safe summary never exposes secrets', () => {
    assert.throws(
      () => getGeminiConfig({ NODE_ENV: 'test' }),
      (err: unknown) =>
        err instanceof GeminiIntegrationError &&
        err.code === 'MISSING_API_KEY' &&
        err.message.includes('GEMINI_API_KEY')
    );

    const summary = getSafeGeminiConfigSummary({
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'AIzaSyShouldNeverAppearInSummary123456',
    });
    assert.equal(summary.configured, true);
    assert.equal(summary.freeTierOnly, true);
    assert.ok(!JSON.stringify(summary).includes('AIzaSyShouldNeverAppearInSummary123456'));
  });

  test('rejects NEXT_PUBLIC_GEMINI_API_KEY and confirms client components never reference Gemini keys', () => {
    const validation = EnvValidator.validate({
      NODE_ENV: 'development',
      DATABASE_URL: 'file:./dev.db',
      BETTER_AUTH_SECRET: 'a-secure-test-secret-that-is-over-32-chars-long',
      NEXT_PUBLIC_GEMINI_API_KEY: 'forbidden-public-key',
    });
    assert.equal(validation.isValid, false);
    assert.ok(validation.errors.some((e) => e.includes('NEXT_PUBLIC_GEMINI_API_KEY')));

    const summary = getSafeGeminiConfigSummary({
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'AIzaSyTestOnlySyntheticKeyValue123456',
      NEXT_PUBLIC_GEMINI_API_KEY: 'forbidden-public-key',
    });
    assert.equal(summary.configured, false);
    assert.ok(summary.securityViolation?.includes('NEXT_PUBLIC_GEMINI_API_KEY'));

    const srcRoot = path.resolve(process.cwd(), 'src');
    const allSrcFiles = collectFilesRecursive(srcRoot);
    for (const file of allSrcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const isClientComponent = /^\s*['"]use client['"]/.test(content);
      const isComponentDir = file.includes(`${path.sep}components${path.sep}`);
      if (isClientComponent || isComponentDir) {
        assert.ok(
          !content.includes('GEMINI_API_KEY'),
          `Client file ${file} must never reference GEMINI_API_KEY`
        );
        assert.ok(
          !content.includes('NEXT_PUBLIC_GEMINI_API_KEY'),
          `Client file ${file} must never reference NEXT_PUBLIC_GEMINI_API_KEY`
        );
        assert.ok(
          !content.includes('@/server/ai/gemini'),
          `Client file ${file} must never import server Gemini modules`
        );
      }
    }
  });

  test('enforces server-only runtime guard when browser globals exist', () => {
    const originalWindow = (globalThis as Record<string, unknown>).window;
    try {
      (globalThis as Record<string, unknown>).window = {};
      assert.throws(
        () =>
          getGeminiConfig({
            NODE_ENV: 'test',
            GEMINI_API_KEY: 'AIzaSyTestOnlySyntheticKeyValue123456',
          }),
        (err: unknown) =>
          err instanceof GeminiIntegrationError && err.code === 'CLIENT_CONTEXT_FORBIDDEN'
      );
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = originalWindow;
      }
    }
  });

  test('reuses singleton GoogleGenAI client for identical config without creating duplicates', () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'AIzaSySingletonClientTestKey12345678',
    };

    const clientA = getGeminiClient(env);
    const clientB = getGeminiClient(env);
    assert.strictEqual(clientA, clientB);

    resetGeminiClientForTesting();
    const clientC = getGeminiClient(env);
    assert.notStrictEqual(clientA, clientC);
  });

  test('blocks paid models under Free Tier Only policy without auto-upgrading', async () => {
    assert.throws(
      () =>
        getGeminiConfig({
          NODE_ENV: 'test',
          GEMINI_API_KEY: 'AIzaSyTestOnlySyntheticKeyValue123456',
          GEMINI_VISION_MODEL: 'gemini-2.5-pro',
        }),
      (err: unknown) =>
        err instanceof GeminiIntegrationError && err.code === 'PAID_MODEL_BLOCKED'
    );

    const res = await runGeminiConnectionTest({
      model: 'gemini-4-argon',
      env: {
        NODE_ENV: 'test',
        GEMINI_API_KEY: 'AIzaSyTestOnlySyntheticKeyValue123456',
      },
    });
    assert.equal(res.status, 'GEMINI CONNECTION: FAILED');
    assert.equal(res.ok, false);
    assert.equal(res.errorCode, 'PAID_MODEL_BLOCKED');
  });

  test('normalizes all required Gemini failure categories and scrubs keys', () => {
    const invalidKey = normalizeGeminiError(
      Object.assign(new Error('API key not valid. Please pass a valid API key. AIzaSyLeakyKey1234567890123'), {
        status: 400,
      })
    );
    assert.equal(invalidKey.code, 'INVALID_API_KEY');
    assert.ok(!invalidKey.message.includes('AIzaSyLeakyKey'));

    const rateLimit = normalizeGeminiError(
      Object.assign(new Error('Too many requests: rate limit exceeded'), { status: 429 })
    );
    assert.equal(rateLimit.code, 'RATE_LIMIT_EXCEEDED');
    assert.equal(rateLimit.isRetryable, true);

    const quotaExceeded = normalizeGeminiError(
      Object.assign(new Error('RESOURCE_EXHAUSTED: You exceeded your current quota, limit: 0'), {
        status: 429,
      })
    );
    assert.equal(quotaExceeded.code, 'QUOTA_EXCEEDED');
    assert.equal(quotaExceeded.isRetryable, false);

    const networkErr = normalizeGeminiError(
      Object.assign(new Error('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
      })
    );
    assert.equal(networkErr.code, 'NETWORK_FAILURE');
    assert.equal(networkErr.isRetryable, true);

    const unsupportedModel = normalizeGeminiError(
      Object.assign(
        new Error('This model models/gemini-2.5-flash is no longer available to new users.'),
        { status: 404 }
      ),
      { model: 'gemini-2.5-flash' }
    );
    assert.equal(unsupportedModel.code, 'UNSUPPORTED_MODEL');

    const provider503 = normalizeGeminiError(
      Object.assign(new Error('This model is currently experiencing high demand.'), { status: 503 })
    );
    assert.equal(provider503.code, 'PROVIDER_ERROR');
    assert.equal(provider503.statusCode, 503);
  });

  test('runGeminiConnectionTest reports SUCCESS and FAILED accurately', async () => {
    const missingRes = await runGeminiConnectionTest({ env: { NODE_ENV: 'test' } });
    assert.equal(missingRes.status, 'GEMINI CONNECTION: FAILED');
    assert.equal(missingRes.ok, false);
    assert.equal(missingRes.errorCode, 'MISSING_API_KEY');

    const mockOkClient: GeminiClientLike = {
      models: {
        generateContent: async () => makeMockResponse('OK'),
      },
    };
    const okRes = await runGeminiConnectionTest({
      env: {
        NODE_ENV: 'test',
        GEMINI_API_KEY: 'AIzaSyMockConnectionTestKey123456789',
      },
      client: mockOkClient,
    });
    assert.equal(okRes.status, 'GEMINI CONNECTION: SUCCESS');
    assert.equal(okRes.ok, true);
    assert.equal(okRes.model, DEFAULT_GEMINI_VISION_MODEL);
    assert.equal(okRes.responsePreview, 'OK');

    const emptyClient: GeminiClientLike = {
      models: {
        generateContent: async () => makeMockResponse(''),
      },
    };
    const emptyRes = await runGeminiConnectionTest({
      env: {
        NODE_ENV: 'test',
        GEMINI_API_KEY: 'AIzaSyMockConnectionTestKey123456789',
      },
      client: emptyClient,
    });
    assert.equal(emptyRes.status, 'GEMINI CONNECTION: FAILED');
    assert.equal(emptyRes.ok, false);
    assert.equal(emptyRes.errorCode, 'INVALID_RESPONSE');
  });

  test('GeminiEvidenceService enforces privacy redaction and parses structured JSON results', async () => {
    let capturedPrompt = '';
    const mockMultimodalClient: GeminiClientLike = {
      models: {
        generateContent: async (params) => {
          capturedPrompt = JSON.stringify(params.contents);
          if (capturedPrompt.includes('commerce product inspection analyst')) {
            return makeMockResponse(
              JSON.stringify({
                productObserved: {
                  summary: 'Synthetic SSD enclosure test sample',
                  brandOrMaker: 'SyntheticBrand',
                  modelOrVariant: 'SB-1TB',
                  colorOrFinish: 'Black',
                  visibleCapacityOrSpec: '1TB',
                },
                conditionAssessment: 'LIKE_NEW',
                packagingObservations: {
                  sealState: 'INTACT',
                  packagingCondition: 'Clean synthetic test packaging',
                },
                visibleIdentifiers: [
                  {
                    identifierType: 'CAPACITY_LABEL',
                    value: '1TB',
                    confidence: 0.95,
                  },
                ],
                damageIndicators: [],
                limitations: ['Synthetic test sample'],
              })
            );
          }

          if (capturedPrompt.includes('unboxing and product-evidence video analyst')) {
            return makeMockResponse(
              JSON.stringify({
                sceneSummary: 'Synthetic 1-second red test clip',
                timelineObservations: [
                  {
                    timestampRange: '00:00-00:01',
                    eventCategory: 'OTHER',
                    observation: 'Uniform synthetic test frame',
                    confidence: 0.99,
                  },
                ],
                visibleIdentifiers: [],
                continuitySignals: {
                  appearsContinuous: true,
                  notes: ['No frame cuts detected'],
                },
                limitations: ['Synthetic video clip'],
              })
            );
          }

          return makeMockResponse(
            JSON.stringify({
              sceneSummary: 'Synthetic red square image',
              dominantSubjects: ['Red square'],
              visibleTextSnippets: [],
              observations: [
                {
                  category: 'OTHER',
                  summary: 'Uniform red test pixels',
                  confidence: 0.99,
                },
              ],
              limitations: ['Synthetic test PNG'],
            })
          );
        },
      },
    };

    const service = new GeminiEvidenceService({
      env: {
        NODE_ENV: 'test',
        GEMINI_API_KEY: 'AIzaSyMockEvidenceServiceKey12345678',
      },
      client: mockMultimodalClient,
    });

    // 1. Privacy policy block when unredacted/non-synthetic
    await assert.rejects(
      () =>
        service.analyzeImage({
          title: 'Unredacted Invoice',
          media: { mimeType: 'image/png', data: Buffer.from([137, 80, 78, 71]) },
          privacyContext: { isSyntheticOrRedacted: false },
        }),
      (err: unknown) =>
        err instanceof GeminiIntegrationError && err.code === 'PRIVACY_POLICY_BLOCKED'
    );

    // 2. General image understanding + card PAN redaction in context
    const imageRes = await service.analyzeImage({
      title: 'Synthetic PNG',
      media: { mimeType: 'image/png', data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) },
      associatedContext: 'Card 4532 0151 1283 0366 should be redacted',
      privacyContext: { isSyntheticOrRedacted: true },
    });
    assert.equal(imageRes.analysis.sceneSummary, 'Synthetic red square image');
    assert.equal(imageRes.metadata.advisoryOnly, true);
    assert.equal(imageRes.metadata.autoDecisionAllowed, false);
    assert.ok(!capturedPrompt.includes('4532 0151 1283 0366'));

    // 3. Product photograph analysis
    const productRes = await service.analyzeProductPhotograph({
      title: 'Synthetic Product Photo',
      media: { mimeType: 'image/jpeg', data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) },
      expectedProductTitle: 'SyntheticBrand 1TB SSD',
      privacyContext: { isSyntheticOrRedacted: true },
    });
    assert.equal(productRes.analysis.conditionAssessment, 'LIKE_NEW');
    assert.equal(productRes.requiresHumanReview, true);

    // 4. Video-frame understanding
    const videoRes = await service.analyzeVideoFrames({
      title: 'Synthetic Clip',
      media: { mimeType: 'video/mp4', data: Buffer.from('00000018ftypmp42', 'ascii') },
      samplingFps: 2,
      privacyContext: { isSyntheticOrRedacted: true },
    });
    assert.equal(videoRes.analysis.continuitySignals.appearsContinuous, true);
    assert.equal(videoRes.requiresHumanReview, true);

    // 5. Rejects malformed JSON instead of creating fake verification results
    const badJsonService = new GeminiEvidenceService({
      env: {
        NODE_ENV: 'test',
        GEMINI_API_KEY: 'AIzaSyMockEvidenceServiceKey12345678',
      },
      client: {
        models: {
          generateContent: async () => makeMockResponse('not-valid-json'),
        },
      },
    });
    await assert.rejects(
      () =>
        badJsonService.analyzeImage({
          title: 'Broken Output Test',
          media: { mimeType: 'image/png', data: Buffer.from([137, 80, 78, 71]) },
          privacyContext: { isSyntheticOrRedacted: true },
        }),
      (err: unknown) => err instanceof GeminiIntegrationError && err.code === 'INVALID_RESPONSE'
    );
  });

  test('/api/ai/gemini/health enforces platform admin auth and never leaks API keys', async () => {
    // 1. Unauthenticated -> 401
    const unauthRes = await geminiHealthGET(
      buildNextRequest('http://localhost:3000/api/ai/gemini/health')
    );
    assert.equal(unauthRes.status, 401);

    // 2. Buyer -> 403
    const buyerRes = await geminiHealthGET(
      buildNextRequest('http://localhost:3000/api/ai/gemini/health', {
        demoEmail: 'alex.morgan@consumer.demo',
      })
    );
    assert.equal(buyerRes.status, 403);

    // 3. Platform Admin GET -> 200 without key
    const prevKey = process.env.GEMINI_API_KEY;
    try {
      process.env.GEMINI_API_KEY = 'AIzaSyAdminRouteTestNeverLeakKey12345';
      const adminGetRes = await geminiHealthGET(
        buildNextRequest('http://localhost:3000/api/ai/gemini/health', {
          demoEmail: 'admin@resolvegraph.demo',
        })
      );
      assert.equal(adminGetRes.status, 200);
      const getBody = await adminGetRes.json();
      assert.equal(getBody.configured, true);
      assert.equal(getBody.freeTierOnly, true);
      assert.ok(!JSON.stringify(getBody).includes('AIzaSyAdminRouteTestNeverLeakKey12345'));

      // 4. Platform Admin POST with injected mock client -> 200 SUCCESS
      setGeminiClientForTesting({
        models: {
          generateContent: async () => makeMockResponse('OK'),
        },
      });
      const adminPostRes = await geminiHealthPOST(
        buildNextRequest('http://localhost:3000/api/ai/gemini/health', {
          method: 'POST',
          demoEmail: 'admin@resolvegraph.demo',
          body: {},
        })
      );
      assert.equal(adminPostRes.status, 200);
      const postBody = await adminPostRes.json();
      assert.equal(postBody.status, 'GEMINI CONNECTION: SUCCESS');
      assert.equal(postBody.ok, true);
      assert.ok(!JSON.stringify(postBody).includes('AIzaSyAdminRouteTestNeverLeakKey12345'));
    } finally {
      if (prevKey === undefined) {
        delete process.env.GEMINI_API_KEY;
      } else {
        process.env.GEMINI_API_KEY = prevKey;
      }
    }
  });
});
