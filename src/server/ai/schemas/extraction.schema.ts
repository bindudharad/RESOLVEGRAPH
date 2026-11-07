import { z } from 'zod';

export const FactTypeSchema = z.enum([
  'PRODUCT_SPECIFICATION',
  'PRICE_PAID',
  'TRACKING_NUMBER',
  'DELIVERY_DATE',
  'DELIVERY_ADDRESS',
  'CONDITION_DESCRIPTION',
  'SERIAL_NUMBER',
  'RETURN_TRACKING',
  'REFUND_POLICY',
  'COMMUNICATION_RECORD',
  'OTHER'
]);

export type FactType = z.infer<typeof FactTypeSchema>;

export const BoundingBoxSchema = z.object({
  ymin: z.number().min(0).max(1000),
  xmin: z.number().min(0).max(1000),
  ymax: z.number().min(0).max(1000),
  xmax: z.number().min(0).max(1000),
  label: z.string().optional()
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const RawExtractedFactSchema = z.object({
  factType: FactTypeSchema,
  name: z.string().min(1),
  rawValue: z.string(),
  normalizedValue: z.string(),
  confidence: z.number().min(0).max(1),
  sourceExcerpt: z.string(),
  pageNumber: z.number().int().positive().optional().nullable(),
  charStart: z.number().int().min(0).optional().nullable(),
  charEnd: z.number().int().min(0).optional().nullable(),
  boundingBox: BoundingBoxSchema.optional().nullable(),
  isSubjective: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).optional()
});

export type RawExtractedFact = z.infer<typeof RawExtractedFactSchema>;

export const DocumentExtractionResultSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  extractedText: z.string(),
  pageCount: z.number().int().min(0),
  isScanned: z.boolean().default(false),
  facts: z.array(RawExtractedFactSchema),
  tokensUsed: z.number().int().min(0).default(0),
  redactedItemCount: z.number().int().min(0).default(0)
});

export type DocumentExtractionResult = z.infer<typeof DocumentExtractionResultSchema>;

export const ClaimExtractionResultSchema = z.object({
  claimId: z.string(),
  party: z.enum(['BUYER', 'MERCHANT', 'PLATFORM']),
  category: z.string(),
  statedFacts: z.array(RawExtractedFactSchema),
  demandedRemedy: z.string().optional().nullable(),
  tokensUsed: z.number().int().min(0).default(0)
});

export type ClaimExtractionResult = z.infer<typeof ClaimExtractionResultSchema>;
