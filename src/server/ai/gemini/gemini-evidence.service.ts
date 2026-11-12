/**
 * RESOLVEGRAPH — Google Gemini Multimodal Evidence Service (Preparation Layer)
 *
 * Implements reusable server-side interfaces for image understanding,
 * product photograph analysis, video-frame understanding, and structured JSON
 * responses for the upcoming Buyer Evidence Verification Engine.
 *
 * Safeguards:
 * - Enforces Free Tier Only model policy (never switches to paid models).
 * - Enforces synthetic/redacted evidence attestation on Free Tier.
 * - Redacts and sanitizes any associated text before transmission.
 * - Advisory outputs only: never emits fake verification results or executes remedies.
 */

import type { Part } from '@google/genai';
import { ContentSanitizer } from '../security/content-sanitizer';
import { DataRedactor } from '../security/data-redactor';
import { executeGeminiCall, type GeminiClientLike } from './gemini-client';
import {
  assertFreeTierModelAllowed,
  assertGeminiServerContext,
  getGeminiConfig,
  normalizeGeminiModelName,
} from './gemini-config';
import { GeminiIntegrationError } from './gemini-errors';
import {
  GEMINI_SUPPORTED_IMAGE_MIME_TYPES,
  GEMINI_SUPPORTED_VIDEO_MIME_TYPES,
  GeminiImageStructuredOutputSchema,
  GeminiProductPhotoStructuredOutputSchema,
  GeminiVideoStructuredOutputSchema,
  type GeminiEvidenceVerificationPort,
  type GeminiExecutionMetadata,
  type GeminiImageAnalysisRequest,
  type GeminiImageAnalysisResult,
  type GeminiMediaPayload,
  type GeminiPrivacyAttestation,
  type GeminiProductPhotoAnalysisResult,
  type GeminiProductPhotoRequest,
  type GeminiSupportedImageMimeType,
  type GeminiSupportedVideoMimeType,
  type GeminiVideoAnalysisRequest,
  type GeminiVideoAnalysisResult,
} from './gemini-evidence.types';

const MAX_INLINE_MEDIA_BYTES = 8 * 1024 * 1024; // 8 MB inline threshold; larger media uses Files API

const BOUNDING_BOX_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ymin: { type: 'number' },
    xmin: { type: 'number' },
    ymax: { type: 'number' },
    xmax: { type: 'number' },
    label: { type: 'string' },
  },
  required: ['ymin', 'xmin', 'ymax', 'xmax'],
} as const;

const IMAGE_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    sceneSummary: { type: 'string' },
    dominantSubjects: { type: 'array', items: { type: 'string' } },
    visibleTextSnippets: { type: 'array', items: { type: 'string' } },
    observations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: [
              'PRODUCT_APPEARANCE',
              'DAMAGE_OR_DEFECT',
              'LABEL_OR_IDENTIFIER',
              'PACKAGING_OR_SEAL',
              'DOCUMENT_TEXT',
              'OTHER',
            ],
          },
          summary: { type: 'string' },
          confidence: { type: 'number' },
          boundingBox: BOUNDING_BOX_JSON_SCHEMA,
        },
        required: ['category', 'summary', 'confidence'],
      },
    },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: ['sceneSummary', 'dominantSubjects', 'visibleTextSnippets', 'observations', 'limitations'],
} as const;

const VISIBLE_IDENTIFIER_JSON_SCHEMA = {
  type: 'object',
  properties: {
    identifierType: {
      type: 'string',
      enum: ['SERIAL_NUMBER', 'MODEL_NUMBER', 'BARCODE', 'CAPACITY_LABEL', 'SEAL_TEXT', 'OTHER'],
    },
    value: { type: 'string' },
    confidence: { type: 'number' },
    boundingBox: BOUNDING_BOX_JSON_SCHEMA,
  },
  required: ['identifierType', 'value', 'confidence'],
} as const;

const PRODUCT_PHOTO_JSON_SCHEMA = {
  type: 'object',
  properties: {
    productObserved: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        brandOrMaker: { type: 'string' },
        modelOrVariant: { type: 'string' },
        colorOrFinish: { type: 'string' },
        visibleCapacityOrSpec: { type: 'string' },
      },
      required: ['summary'],
    },
    conditionAssessment: {
      type: 'string',
      enum: [
        'NEW_SEALED',
        'LIKE_NEW',
        'USED',
        'DAMAGED',
        'WRONG_ITEM_INDICATORS',
        'INCONCLUSIVE',
      ],
    },
    packagingObservations: {
      type: 'object',
      properties: {
        sealState: {
          type: 'string',
          enum: ['INTACT', 'BROKEN_OR_OPENED', 'NOT_VISIBLE', 'UNCERTAIN'],
        },
        packagingCondition: { type: 'string' },
      },
      required: ['sealState', 'packagingCondition'],
    },
    visibleIdentifiers: { type: 'array', items: VISIBLE_IDENTIFIER_JSON_SCHEMA },
    damageIndicators: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          locationDescription: { type: 'string' },
          confidence: { type: 'number' },
          boundingBox: BOUNDING_BOX_JSON_SCHEMA,
        },
        required: ['description', 'severity', 'locationDescription', 'confidence'],
      },
    },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'productObserved',
    'conditionAssessment',
    'packagingObservations',
    'visibleIdentifiers',
    'damageIndicators',
    'limitations',
  ],
} as const;

const VIDEO_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    sceneSummary: { type: 'string' },
    timelineObservations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestampRange: { type: 'string' },
          eventCategory: {
            type: 'string',
            enum: [
              'UNBOXING',
              'SEAL_CHECK',
              'CHALLENGE_CODE_VISIBLE',
              'ITEM_REVEAL',
              'DEFECT_DEMONSTRATION',
              'LABEL_VIEW',
              'CONTINUITY_ISSUE',
              'OTHER',
            ],
          },
          observation: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['timestampRange', 'eventCategory', 'observation', 'confidence'],
      },
    },
    visibleIdentifiers: { type: 'array', items: VISIBLE_IDENTIFIER_JSON_SCHEMA },
    continuitySignals: {
      type: 'object',
      properties: {
        appearsContinuous: { type: 'boolean' },
        notes: { type: 'array', items: { type: 'string' } },
      },
      required: ['notes'],
    },
    limitations: { type: 'array', items: { type: 'string' } },
  },
  required: ['sceneSummary', 'timelineObservations', 'visibleIdentifiers', 'continuitySignals', 'limitations'],
} as const;

export interface GeminiEvidenceServiceOptions {
  env?: NodeJS.ProcessEnv;
  client?: GeminiClientLike;
}

function assertPrivacyPolicy(privacy: GeminiPrivacyAttestation, freeTierOnly: boolean): void {
  if (freeTierOnly && !privacy?.isSyntheticOrRedacted) {
    throw new GeminiIntegrationError({
      code: 'PRIVACY_POLICY_BLOCKED',
      statusCode: 400,
      isRetryable: false,
      message:
        'Privacy policy block: Gemini Free Tier analysis only accepts synthetic or properly redacted test files until a paid privacy agreement is configured.',
    });
  }
}

function sanitizeContextText(rawText: string | undefined, label: string): string {
  if (!rawText) return '';
  const redacted = DataRedactor.redact(rawText);
  return ContentSanitizer.sanitize(redacted.redactedText, label).sanitizedContent;
}

function normalizeMediaToBuffer(data: Buffer | string): { buffer: Buffer; base64: string } {
  if (Buffer.isBuffer(data)) {
    if (data.byteLength === 0) {
      throw new GeminiIntegrationError({
        code: 'INVALID_RESPONSE',
        statusCode: 400,
        isRetryable: false,
        message: 'Media payload buffer cannot be empty.',
      });
    }
    return { buffer: data, base64: data.toString('base64') };
  }

  const stripped = data.replace(/^data:[^;]+;base64,/i, '').trim();
  if (!stripped) {
    throw new GeminiIntegrationError({
      code: 'INVALID_RESPONSE',
      statusCode: 400,
      isRetryable: false,
      message: 'Media base64 payload cannot be empty.',
    });
  }
  const buffer = Buffer.from(stripped, 'base64');
  return { buffer, base64: stripped };
}

function validateMimeType<T extends string>(mimeType: T, allowed: readonly T[], label: string): void {
  if (!allowed.includes(mimeType)) {
    throw new GeminiIntegrationError({
      code: 'UNSUPPORTED_MODEL',
      statusCode: 400,
      isRetryable: false,
      message: `Unsupported ${label} MIME type "${mimeType}". Allowed: ${allowed.join(', ')}.`,
    });
  }
}

function parseStructuredJson<T>(
  rawText: string | undefined,
  schema: { safeParse: (val: unknown) => { success: true; data: T } | { success: false; error: unknown } },
  model: string
): T {
  const text = typeof rawText === 'string' ? rawText.trim() : '';
  if (!text) {
    throw new GeminiIntegrationError({
      code: 'INVALID_RESPONSE',
      statusCode: 502,
      model,
      isRetryable: false,
      message: 'Gemini returned an empty response when structured JSON output was expected.',
    });
  }

  let jsonValue: unknown;
  try {
    jsonValue = JSON.parse(text);
  } catch (err) {
    throw new GeminiIntegrationError({
      code: 'INVALID_RESPONSE',
      statusCode: 502,
      model,
      isRetryable: false,
      message: 'Gemini returned non-JSON text for a structured JSON verification request.',
      cause: err,
    });
  }

  const parsed = schema.safeParse(jsonValue);
  if (!parsed.success) {
    throw new GeminiIntegrationError({
      code: 'INVALID_RESPONSE',
      statusCode: 502,
      model,
      isRetryable: false,
      message: 'Gemini JSON response did not conform to the expected verification schema.',
    });
  }

  return parsed.data;
}

export class GeminiEvidenceService implements GeminiEvidenceVerificationPort {
  private readonly env: NodeJS.ProcessEnv;
  private readonly clientOverride?: GeminiClientLike;

  constructor(options?: GeminiEvidenceServiceOptions) {
    assertGeminiServerContext();
    this.env = options?.env ?? process.env;
    this.clientOverride = options?.client;
  }

  /**
   * General image understanding returning structured JSON observations.
   */
  public async analyzeImage(
    request: GeminiImageAnalysisRequest
  ): Promise<GeminiImageAnalysisResult> {
    const start = Date.now();
    const config = getGeminiConfig(this.env);
    assertPrivacyPolicy(request.privacyContext, config.freeTierOnly);
    validateMimeType<GeminiSupportedImageMimeType>(
      request.media.mimeType,
      GEMINI_SUPPORTED_IMAGE_MIME_TYPES,
      'image'
    );

    const model = normalizeGeminiModelName(request.modelOverride?.trim() || config.visionModel);
    assertFreeTierModelAllowed(model, config.freeTierOnly);

    const { base64 } = normalizeMediaToBuffer(request.media.data);
    const safeTitle = DataRedactor.redact(request.title).redactedText;
    const safePrompt = request.analysisPrompt
      ? sanitizeContextText(request.analysisPrompt, 'analysis_prompt')
      : 'Inspect the image and report objective visual observations and visible text.';
    const safeContext = sanitizeContextText(request.associatedContext, 'image_context');

    const promptText = [
      'You are an advisory forensic evidence analyst for RESOLVEGRAPH.',
      'Only report observations directly visible in the provided image. Never invent facts.',
      `Artifact Title: ${safeTitle}`,
      `Instruction: ${safePrompt}`,
      safeContext ? `Context:\n${safeContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await executeGeminiCall(
      (client) =>
        client.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: request.media.mimeType,
                data: base64,
              },
            },
            promptText,
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseJsonSchema: IMAGE_ANALYSIS_JSON_SCHEMA,
          },
        }),
      { env: this.env, client: this.clientOverride, model }
    );

    const analysis = parseStructuredJson(
      response.text,
      GeminiImageStructuredOutputSchema,
      model
    );

    return {
      ...(request.evidenceId ? { evidenceId: request.evidenceId } : {}),
      analysis,
      metadata: this.buildMetadata(model, config.freeTierOnly, start, response),
    };
  }

  /**
   * Product photograph inspection for condition, labels, seals, and physical damage indicators.
   */
  public async analyzeProductPhotograph(
    request: GeminiProductPhotoRequest
  ): Promise<GeminiProductPhotoAnalysisResult> {
    const start = Date.now();
    const config = getGeminiConfig(this.env);
    assertPrivacyPolicy(request.privacyContext, config.freeTierOnly);
    validateMimeType<GeminiSupportedImageMimeType>(
      request.media.mimeType,
      GEMINI_SUPPORTED_IMAGE_MIME_TYPES,
      'image'
    );

    const model = normalizeGeminiModelName(request.modelOverride?.trim() || config.visionModel);
    assertFreeTierModelAllowed(model, config.freeTierOnly);

    const { base64 } = normalizeMediaToBuffer(request.media.data);
    const safeTitle = DataRedactor.redact(request.title).redactedText;
    const safeExpected = request.expectedProductTitle
      ? DataRedactor.redact(request.expectedProductTitle).redactedText
      : undefined;
    const safeSpecs = (request.expectedSpecifications || []).map(
      (s) => DataRedactor.redact(s).redactedText
    );

    const promptText = [
      'You are a commerce product inspection analyst for RESOLVEGRAPH.',
      'Examine the product photograph objectively. Identify visible product traits, packaging seal state, visible serial/model/capacity labels, and any visible physical damage.',
      'Estimate bounding boxes on a 0-1000 scale when visible. Do not guess obscured text or issue refund/approval decisions.',
      `Photograph Title: ${safeTitle}`,
      safeExpected ? `Declared Product Reference: ${safeExpected}` : '',
      safeSpecs.length > 0 ? `Declared Specifications: ${safeSpecs.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await executeGeminiCall(
      (client) =>
        client.models.generateContent({
          model,
          contents: [
            {
              inlineData: {
                mimeType: request.media.mimeType,
                data: base64,
              },
            },
            promptText,
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseJsonSchema: PRODUCT_PHOTO_JSON_SCHEMA,
          },
        }),
      { env: this.env, client: this.clientOverride, model }
    );

    const analysis = parseStructuredJson(
      response.text,
      GeminiProductPhotoStructuredOutputSchema,
      model
    );

    return {
      ...(request.evidenceId ? { evidenceId: request.evidenceId } : {}),
      analysis,
      requiresHumanReview: true,
      metadata: this.buildMetadata(model, config.freeTierOnly, start, response),
    };
  }

  /**
   * Video-frame understanding for unboxing clips and physical evidence verification.
   */
  public async analyzeVideoFrames(
    request: GeminiVideoAnalysisRequest
  ): Promise<GeminiVideoAnalysisResult> {
    const start = Date.now();
    const config = getGeminiConfig(this.env);
    assertPrivacyPolicy(request.privacyContext, config.freeTierOnly);
    validateMimeType<GeminiSupportedVideoMimeType>(
      request.media.mimeType,
      GEMINI_SUPPORTED_VIDEO_MIME_TYPES,
      'video'
    );

    const model = normalizeGeminiModelName(request.modelOverride?.trim() || config.videoModel);
    assertFreeTierModelAllowed(model, config.freeTierOnly);

    const { buffer, base64 } = normalizeMediaToBuffer(request.media.data);
    const safeTitle = DataRedactor.redact(request.title).redactedText;
    const safeContext = sanitizeContextText(request.associatedContext, 'video_context');

    const promptText = [
      'You are a forensic unboxing and product-evidence video analyst for RESOLVEGRAPH.',
      'Summarize chronological events observable across video frames, visible packaging seals, visible identifiers, and any observable continuity cuts.',
      'Do not fabricate obscured details or trigger automated dispute outcomes.',
      `Video Title: ${safeTitle}`,
      request.expectedChallengeCode
        ? `Verify whether this numeric challenge code appears visibly in frame: ${DataRedactor.redact(request.expectedChallengeCode).redactedText}`
        : '',
      safeContext ? `Context:\n${safeContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const videoMetadata = this.buildVideoMetadata(request);

    const response = await executeGeminiCall(
      async (client) => {
        const mediaParts = await this.buildVideoMediaPart(
          client,
          request.media,
          buffer,
          base64,
          videoMetadata
        );

        try {
          return await client.models.generateContent({
            model,
            contents: [...mediaParts.parts, promptText],
            config: {
              temperature: 0.1,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseJsonSchema: VIDEO_ANALYSIS_JSON_SCHEMA,
            },
          });
        } finally {
          await mediaParts.cleanup();
        }
      },
      { env: this.env, client: this.clientOverride, model }
    );

    const analysis = parseStructuredJson(
      response.text,
      GeminiVideoStructuredOutputSchema,
      model
    );

    return {
      ...(request.evidenceId ? { evidenceId: request.evidenceId } : {}),
      analysis,
      requiresHumanReview: true,
      metadata: this.buildMetadata(model, config.freeTierOnly, start, response),
    };
  }

  private buildVideoMetadata(request: GeminiVideoAnalysisRequest): Part['videoMetadata'] {
    const meta: NonNullable<Part['videoMetadata']> = {};
    if (typeof request.samplingFps === 'number' && request.samplingFps > 0) {
      meta.fps = request.samplingFps;
    }
    if (typeof request.startOffsetSeconds === 'number' && request.startOffsetSeconds >= 0) {
      meta.startOffset = `${request.startOffsetSeconds}s`;
    }
    if (typeof request.endOffsetSeconds === 'number' && request.endOffsetSeconds > 0) {
      meta.endOffset = `${request.endOffsetSeconds}s`;
    }
    return Object.keys(meta).length > 0 ? meta : undefined;
  }

  private async buildVideoMediaPart(
    client: GeminiClientLike,
    media: GeminiMediaPayload<GeminiSupportedVideoMimeType>,
    buffer: Buffer,
    base64: string,
    videoMetadata?: Part['videoMetadata']
  ): Promise<{ parts: Part[]; cleanup: () => Promise<void> }> {
    if (buffer.byteLength <= MAX_INLINE_MEDIA_BYTES || !client.files) {
      return {
        parts: [
          {
            inlineData: {
              mimeType: media.mimeType,
              data: base64,
            },
            ...(videoMetadata ? { videoMetadata } : {}),
          },
        ],
        cleanup: async () => {},
      };
    }

    const blob = new Blob([new Uint8Array(buffer)], { type: media.mimeType });
    const uploaded = await client.files.upload({
      file: blob,
      config: {
        mimeType: media.mimeType,
        displayName: media.filename || 'synthetic-redacted-video',
      },
    });

    let activeFile = uploaded;
    for (let attempt = 0; attempt < 15 && activeFile.state === 'PROCESSING'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (activeFile.name) {
        activeFile = await client.files.get({ name: activeFile.name });
      }
    }

    if (activeFile.state === 'FAILED' || !activeFile.uri) {
      if (uploaded.name) {
        await client.files.delete({ name: uploaded.name }).catch(() => {});
      }
      throw new GeminiIntegrationError({
        code: 'PROVIDER_ERROR',
        statusCode: 502,
        isRetryable: false,
        message: 'Gemini Files API failed to process uploaded video media.',
      });
    }

    return {
      parts: [
        {
          fileData: {
            fileUri: activeFile.uri,
            mimeType: activeFile.mimeType || media.mimeType,
          },
          ...(videoMetadata ? { videoMetadata } : {}),
        },
      ],
      cleanup: async () => {
        if (uploaded.name && client.files) {
          await client.files.delete({ name: uploaded.name }).catch(() => {});
        }
      },
    };
  }

  private buildMetadata(
    model: string,
    freeTierOnly: boolean,
    startMs: number,
    response: {
      modelVersion?: string;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    }
  ): GeminiExecutionMetadata {
    return {
      provider: 'google-gemini',
      model,
      ...(response.modelVersion ? { resolvedModelVersion: response.modelVersion } : {}),
      freeTierOnly,
      executionTimeMs: Date.now() - startMs,
      ...(response.usageMetadata
        ? {
            tokenUsage: {
              promptTokens: response.usageMetadata.promptTokenCount ?? 0,
              candidatesTokens: response.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: response.usageMetadata.totalTokenCount ?? 0,
            },
          }
        : {}),
      advisoryOnly: true,
      autoDecisionAllowed: false,
    };
  }
}
