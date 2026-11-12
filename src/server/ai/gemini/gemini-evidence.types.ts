/**
 * RESOLVEGRAPH — Gemini Buyer Evidence Verification Engine Interfaces & Schemas
 *
 * Prepared server-side service contracts for future multimodal evidence analysis:
 * - General image understanding
 * - Product photograph analysis
 * - Video-frame understanding
 * - Strictly typed structured JSON results
 *
 * NOTE: Advisory analysis interfaces only. Not wired to automatic complaint
 * approval, refund execution, BEG, BERR, or the Resolution Engine.
 */

import { z } from 'zod';
import { BoundingBoxSchema } from '../schemas/extraction.schema';

export const GEMINI_SUPPORTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const GEMINI_SUPPORTED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
] as const;

export type GeminiSupportedImageMimeType = (typeof GEMINI_SUPPORTED_IMAGE_MIME_TYPES)[number];
export type GeminiSupportedVideoMimeType = (typeof GEMINI_SUPPORTED_VIDEO_MIME_TYPES)[number];

/**
 * Privacy attestation required before transmitting data to the Gemini Free Tier.
 */
export interface GeminiPrivacyAttestation {
  /**
   * Must be true under Free Tier policy: confirms the payload is synthetic or
   * properly redacted of customer PII, invoices, and financial credentials.
   */
  isSyntheticOrRedacted: boolean;
  redactionSummary?: string;
}

export interface GeminiMediaPayload<TMime extends string> {
  mimeType: TMime;
  /** Raw bytes or base64-encoded binary content (without data URI prefix). */
  data: Buffer | string;
  filename?: string;
}

export interface GeminiTokenUsage {
  promptTokens: number;
  candidatesTokens: number;
  totalTokens: number;
}

export interface GeminiExecutionMetadata {
  provider: 'google-gemini';
  model: string;
  resolvedModelVersion?: string;
  freeTierOnly: boolean;
  executionTimeMs: number;
  tokenUsage?: GeminiTokenUsage;
  advisoryOnly: true;
  autoDecisionAllowed: false;
}

// =============================================================================
// 1. General Image Understanding
// =============================================================================

export interface GeminiImageAnalysisRequest {
  evidenceId?: string;
  title: string;
  media: GeminiMediaPayload<GeminiSupportedImageMimeType>;
  analysisPrompt?: string;
  associatedContext?: string;
  privacyContext: GeminiPrivacyAttestation;
  modelOverride?: string;
}

export const GeminiImageObservationSchema = z.object({
  category: z.enum([
    'PRODUCT_APPEARANCE',
    'DAMAGE_OR_DEFECT',
    'LABEL_OR_IDENTIFIER',
    'PACKAGING_OR_SEAL',
    'DOCUMENT_TEXT',
    'OTHER',
  ]),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  boundingBox: BoundingBoxSchema.optional().nullable(),
});

export const GeminiImageStructuredOutputSchema = z.object({
  sceneSummary: z.string().min(1),
  dominantSubjects: z.array(z.string()).default([]),
  visibleTextSnippets: z.array(z.string()).default([]),
  observations: z.array(GeminiImageObservationSchema).default([]),
  limitations: z.array(z.string()).default([]),
});

export type GeminiImageStructuredOutput = z.infer<typeof GeminiImageStructuredOutputSchema>;

export interface GeminiImageAnalysisResult {
  evidenceId?: string;
  analysis: GeminiImageStructuredOutput;
  metadata: GeminiExecutionMetadata;
}

// =============================================================================
// 2. Product Photograph Analysis
// =============================================================================

export interface GeminiProductPhotoRequest {
  evidenceId?: string;
  title: string;
  media: GeminiMediaPayload<GeminiSupportedImageMimeType>;
  expectedProductTitle?: string;
  expectedSpecifications?: string[];
  privacyContext: GeminiPrivacyAttestation;
  modelOverride?: string;
}

export const GeminiVisibleIdentifierSchema = z.object({
  identifierType: z.enum([
    'SERIAL_NUMBER',
    'MODEL_NUMBER',
    'BARCODE',
    'CAPACITY_LABEL',
    'SEAL_TEXT',
    'OTHER',
  ]),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
  boundingBox: BoundingBoxSchema.optional().nullable(),
});

export const GeminiDamageIndicatorSchema = z.object({
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  locationDescription: z.string().min(1),
  confidence: z.number().min(0).max(1),
  boundingBox: BoundingBoxSchema.optional().nullable(),
});

export const GeminiProductPhotoStructuredOutputSchema = z.object({
  productObserved: z.object({
    summary: z.string().min(1),
    brandOrMaker: z.string().nullable().optional(),
    modelOrVariant: z.string().nullable().optional(),
    colorOrFinish: z.string().nullable().optional(),
    visibleCapacityOrSpec: z.string().nullable().optional(),
  }),
  conditionAssessment: z.enum([
    'NEW_SEALED',
    'LIKE_NEW',
    'USED',
    'DAMAGED',
    'WRONG_ITEM_INDICATORS',
    'INCONCLUSIVE',
  ]),
  packagingObservations: z.object({
    sealState: z.enum(['INTACT', 'BROKEN_OR_OPENED', 'NOT_VISIBLE', 'UNCERTAIN']),
    packagingCondition: z.string().min(1),
  }),
  visibleIdentifiers: z.array(GeminiVisibleIdentifierSchema).default([]),
  damageIndicators: z.array(GeminiDamageIndicatorSchema).default([]),
  limitations: z.array(z.string()).default([]),
});

export type GeminiProductPhotoStructuredOutput = z.infer<
  typeof GeminiProductPhotoStructuredOutputSchema
>;

export interface GeminiProductPhotoAnalysisResult {
  evidenceId?: string;
  analysis: GeminiProductPhotoStructuredOutput;
  requiresHumanReview: true;
  metadata: GeminiExecutionMetadata;
}

// =============================================================================
// 3. Video-Frame Understanding
// =============================================================================

export interface GeminiVideoAnalysisRequest {
  evidenceId?: string;
  title: string;
  media: GeminiMediaPayload<GeminiSupportedVideoMimeType>;
  expectedChallengeCode?: string;
  /** Optional frame sampling rate in FPS (passed to Gemini videoMetadata). */
  samplingFps?: number;
  startOffsetSeconds?: number;
  endOffsetSeconds?: number;
  associatedContext?: string;
  privacyContext: GeminiPrivacyAttestation;
  modelOverride?: string;
}

export const GeminiVideoFrameEventSchema = z.object({
  timestampRange: z.string().min(1),
  eventCategory: z.enum([
    'UNBOXING',
    'SEAL_CHECK',
    'CHALLENGE_CODE_VISIBLE',
    'ITEM_REVEAL',
    'DEFECT_DEMONSTRATION',
    'LABEL_VIEW',
    'CONTINUITY_ISSUE',
    'OTHER',
  ]),
  observation: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const GeminiVideoStructuredOutputSchema = z.object({
  sceneSummary: z.string().min(1),
  timelineObservations: z.array(GeminiVideoFrameEventSchema).default([]),
  visibleIdentifiers: z.array(GeminiVisibleIdentifierSchema).default([]),
  continuitySignals: z.object({
    appearsContinuous: z.boolean().nullable(),
    notes: z.array(z.string()).default([]),
  }),
  limitations: z.array(z.string()).default([]),
});

export type GeminiVideoStructuredOutput = z.infer<typeof GeminiVideoStructuredOutputSchema>;

export interface GeminiVideoAnalysisResult {
  evidenceId?: string;
  analysis: GeminiVideoStructuredOutput;
  requiresHumanReview: true;
  metadata: GeminiExecutionMetadata;
}

// =============================================================================
// 4. Reusable Port Interface for Future Buyer Evidence Verification Engine
// =============================================================================

export interface GeminiEvidenceVerificationPort {
  analyzeImage(request: GeminiImageAnalysisRequest): Promise<GeminiImageAnalysisResult>;
  analyzeProductPhotograph(
    request: GeminiProductPhotoRequest
  ): Promise<GeminiProductPhotoAnalysisResult>;
  analyzeVideoFrames(request: GeminiVideoAnalysisRequest): Promise<GeminiVideoAnalysisResult>;
}
