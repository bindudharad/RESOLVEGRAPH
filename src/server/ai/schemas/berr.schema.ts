import { z } from 'zod';

export const DiscrepancyBreakdownSchema = z.object({
  exactDiscrepancy: z.number().min(0).max(1),
  semanticDiscrepancy: z.number().min(0).max(1),
  temporalDiscrepancy: z.number().min(0).max(1),
  weights: z.object({
    alpha: z.number().default(0.4),
    beta: z.number().default(0.4),
    gamma: z.number().default(0.2)
  }),
  totalDiscrepancyScore: z.number().min(0).max(1)
});

export type DiscrepancyBreakdown = z.infer<typeof DiscrepancyBreakdownSchema>;

export const BilateralFactComparisonSchema = z.object({
  factKey: z.string(),
  factType: z.string(),
  buyerValue: z.string().optional().nullable(),
  merchantValue: z.string().optional().nullable(),
  isMatch: z.boolean(),
  discrepancyType: z.enum(['NONE', 'SPECIFICATION', 'MONETARY', 'TEMPORAL', 'STATUS', 'MISSING_MERCHANT', 'MISSING_BUYER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  explanation: z.string()
});

export type BilateralFactComparison = z.infer<typeof BilateralFactComparisonSchema>;

export const MissingEvidenceItemSchema = z.object({
  party: z.enum(['BUYER', 'MERCHANT', 'CARRIER']),
  evidenceType: z.string(),
  importance: z.enum(['CRITICAL', 'RECOMMENDED', 'OPTIONAL']),
  reason: z.string(),
  suggestedAction: z.string()
});

export type MissingEvidenceItem = z.infer<typeof MissingEvidenceItemSchema>;

export const BerrFindingOutputSchema = z.object({
  findingType: z.enum([
    'SPECIFICATION_MISMATCH',
    'DELIVERY_NON_RECEIPT',
    'DAMAGED_TRANSIT',
    'PRICE_DISCREPANCY',
    'RETURN_POLICY_BREACH',
    'TRACKING_INCONSISTENCY',
    'EVIDENCE_GAP',
    'COUNTERFEIT_SUSPICION',
    'UNRESOLVED_CONFLICT',
    'CONSISTENT_ALIGNMENT'
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  confidence: z.number().min(0).max(1),
  conflictType: z.string().optional().nullable(),
  involvedParties: z.array(z.string()).default([]),
  recommendedNextSteps: z.array(z.string()).default([]),
  supportingFactNames: z.array(z.string()).default([]),
  relatedEvidenceIds: z.array(z.string()).default([])
});

export type BerrFindingOutput = z.infer<typeof BerrFindingOutputSchema>;

export const BerrAnalysisResultSchema = z.object({
  runId: z.string(),
  caseId: z.string(),
  status: z.enum(['COMPLETED', 'NEEDS_HUMAN_REVIEW', 'FAILED']),
  summary: z.string(),
  discrepancy: DiscrepancyBreakdownSchema,
  bilateralMatrix: z.array(BilateralFactComparisonSchema),
  missingEvidence: z.array(MissingEvidenceItemSchema),
  findings: z.array(BerrFindingOutputSchema),
  executionTimeMs: z.number().int().min(0),
  tokenUsage: z.object({
    promptTokens: z.number().int().default(0),
    completionTokens: z.number().int().default(0),
    totalTokens: z.number().int().default(0)
  })
});

export type BerrAnalysisResult = z.infer<typeof BerrAnalysisResultSchema>;
