import { z } from 'zod';

export const GrantConsentSchema = z.object({
  targetType: z.enum(['EVIDENCE', 'CLAIM']),
  targetId: z.string().min(1),
  provider: z.string().default('openai'),
  purpose: z.enum([
    'MULTIMODAL_EXTRACTION',
    'BERR_REASONING',
    'FACT_RECONCILIATION',
    'ALL'
  ]).default('ALL'),
  consentedByRole: z.enum(['BUYER', 'MERCHANT', 'ADMIN', 'RESOLVER']).optional()
});

export type GrantConsentInput = z.infer<typeof GrantConsentSchema>;

export const RevokeConsentSchema = z.object({
  targetType: z.enum(['EVIDENCE', 'CLAIM']),
  targetId: z.string().min(1),
  reason: z.string().optional()
});

export type RevokeConsentInput = z.infer<typeof RevokeConsentSchema>;

export const ReviewFindingSchema = z.object({
  findingId: z.string().min(1),
  action: z.enum(['CONFIRMED', 'CORRECTED', 'REJECTED', 'INCONCLUSIVE']),
  userNotes: z.string().optional(),
  correctedSeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
});

export type ReviewFindingInput = z.infer<typeof ReviewFindingSchema>;
