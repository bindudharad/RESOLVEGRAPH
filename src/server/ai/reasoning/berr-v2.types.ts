/**
 * RESOLVEGRAPH — Structured BERR (Bilateral Evidence-to-Remedy Reasoning) Schemas & Contracts
 *
 * Strictly validated via Zod before persistence or API delivery so AI outputs or rules
 * never fabricate IDs, mutate verification status improperly, or bypass separation of concerns.
 */

import { z } from "zod";

export const BerrClassificationSchema = z.enum([
  "AGREED",
  "VERIFIED",
  "CONTESTED",
  "MISSING",
]);
export type FactClassification = z.infer<typeof BerrClassificationSchema>;

export const BerrOverallStatusSchema = z.enum([
  "COMPLETED",
  "COMPLETED_WITH_CONFLICTS",
  "REQUIRES_ADDITIONAL_EVIDENCE",
  "HUMAN_REVIEW_REQUIRED",
  "INCONCLUSIVE",
  "FAILED",
]);
export type BerrOverallStatus = z.infer<typeof BerrOverallStatusSchema>;

export const BerrComplaintTrackSchema = z.enum([
  "WRONG_PRODUCT",
  "DAMAGED_GOODS",
  "ITEM_MISSING",
  "SPECIFICATIONS_DIFFER",
  "PAYMENT_PROBLEM",
  "REFUND_NOT_RECEIVED",
  "OTHER",
]);
export type BerrComplaintTrack = z.infer<typeof BerrComplaintTrackSchema>;

export const BerrNextActionTypeSchema = z.enum([
  "REQUEST_ADDITIONAL_BUYER_EVIDENCE",
  "REQUEST_ADDITIONAL_SELLER_EVIDENCE",
  "REQUEST_MARKETPLACE_INFORMATION",
  "REQUEST_LOGISTICS_INFORMATION",
  "START_REINVESTIGATION",
  "ROUTE_TO_HUMAN_REVIEW",
  "PROCEED_TO_POLICY_EVALUATION",
  "PREPARE_REMEDY_RECOMMENDATION",
  "ESCALATE_CASE",
]);
export type BerrNextActionType = z.infer<typeof BerrNextActionTypeSchema>;

export const BerrHumanReviewActionTypeSchema = z.enum([
  "ACCEPT_FINDING",
  "REJECT_FINDING",
  "CORRECT_CLASSIFICATION",
  "CHANGE_NEXT_ACTION",
  "REQUEST_MORE_INFO",
  "ESCALATE_CASE",
]);
export type BerrHumanReviewActionType = z.infer<typeof BerrHumanReviewActionTypeSchema>;

export const BerrStructuredFindingSchema = z.object({
  id: z.string().min(1),
  dbId: z.string().optional(),
  findingId: z.string().min(1), // e.g., BERR-F-001
  field: z.string().min(1),
  classification: BerrClassificationSchema,
  claim: z.string().min(1),
  explanation: z.string().min(1),
  verificationState: z
    .enum(["VERIFIED", "SOURCE_SUPPORTED", "INFERRED", "CONTESTED", "UNVERIFIED"])
    .default("UNVERIFIED"),
  verificationMethod: z.string().optional(),
  verificationAuthority: z.string().optional(),
  verifiedAt: z.string().optional(),
  buyerAssertion: z.string().optional(),
  merchantAssertion: z.string().optional(),
  independentProof: z.string().optional(),
  buyerEvidenceIds: z.array(z.string()).default([]),
  sellerEvidenceIds: z.array(z.string()).default([]),
  supportingEvidenceIds: z.array(z.string()).default([]),
  linkedBegNodeIds: z.array(z.string()).default([]),
  linkedBegEdgeIds: z.array(z.string()).default([]),
  recommendedNextAction: z.string().optional(),
  confidence: z.number().min(0).max(1),
  isHypothesis: z.boolean().default(false),
  originalAiClassification: BerrClassificationSchema.optional(),
  originalAiExplanation: z.string().optional(),
  humanReviewStatus: z.enum(["UNREVIEWED", "ACCEPTED", "REJECTED", "CORRECTED"]).default("UNREVIEWED"),
  reviewedById: z.string().optional(),
  reviewedAt: z.string().optional(),
  humanOverrideReason: z.string().optional(),
});
export type BerrStructuredFinding = z.infer<typeof BerrStructuredFindingSchema>;

export const BerrRecommendedActionItemSchema = z.object({
  id: z.string().optional(),
  action: BerrNextActionTypeSchema,
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  targetParty: z.enum(["BUYER", "SELLER", "MARKETPLACE", "LOGISTICS", "INVESTIGATOR"]),
  reason: z.string().min(1),
  status: z.enum(["PROPOSED", "ACCEPTED", "DISMISSED", "EXECUTED"]).default("PROPOSED"),
});
export type BerrRecommendedActionItem = z.infer<typeof BerrRecommendedActionItemSchema>;

export const BerrRemedyReadinessSchema = z.object({
  status: z.enum(["NOT_READY", "NEEDS_HUMAN_REVIEW", "READY_FOR_POLICY_EVALUATION"]),
  remedy: z
    .enum([
      "REPLACEMENT",
      "FULL_REFUND",
      "PARTIAL_REFUND",
      "RETURN_AND_REFUND",
      "EVIDENCE_REQUEST",
    ])
    .nullable(),
  reason: z.string(),
  policyEligibleRemedies: z.array(z.string()).default([]),
  customerRequestedRemedy: z.string().optional(),
  sellerStance: z.string().optional(),
  humanApprovalRequired: z.literal(true),
  autonomousExecutionAllowed: z.literal(false),
});
export type BerrRemedyReadiness = z.infer<typeof BerrRemedyReadinessSchema>;

export const BerrQualityCheckItemSchema = z.object({
  check: z.string(),
  passed: z.boolean(),
  note: z.string(),
});

export const BerrQualityReviewResultSchema = z.object({
  passed: z.boolean(),
  checks: z.array(BerrQualityCheckItemSchema),
  strippedInvalidReferences: z.array(z.string()).default([]),
  routedToHumanReview: z.boolean(),
  limitations: z.array(z.string()).default([]),
});
export type BerrQualityReviewResult = z.infer<typeof BerrQualityReviewResultSchema>;

export const BerrInvestigationContextSchema = z.object({
  complaintId: z.string(),
  caseNumber: z.string(),
  complaintTrack: BerrComplaintTrackSchema,
  begReady: z.boolean(),
  begNodeCount: z.number().int().nonnegative(),
  begEdgeCount: z.number().int().nonnegative(),
  buyerInfo: z.object({
    title: z.string(),
    originalDescription: z.string(),
    requestedRemedy: z.string(),
    evidenceCount: z.number().int().nonnegative(),
    claimCount: z.number().int().nonnegative(),
    extractedOrderId: z.string().nullable(),
    extractedProduct: z.string().nullable(),
    extractedCapacity: z.string().nullable(),
  }),
  sellerInfo: z.object({
    identifiedSellerName: z.string().nullable(),
    sellerMatchOutcome: z.string().nullable(),
    gstin: z.string().nullable(),
    hasResponse: z.boolean(),
    stance: z.string().nullable(),
    originalExplanation: z.string().nullable(),
    evidenceCount: z.number().int().nonnegative(),
    declaredCapacity: z.string().nullable(),
  }),
  sharedInfo: z.object({
    marketplace: z.string().nullable(),
    orderId: z.string().nullable(),
    productName: z.string().nullable(),
    sku: z.string().nullable(),
    amountMinor: z.number().int().nonnegative(),
    currency: z.string(),
    paymentStatus: z.string().nullable(),
    refundStatus: z.string().nullable(),
    sealStatus: z.string().nullable(),
    carrierName: z.string().nullable(),
    trackingNumber: z.string().nullable(),
  }),
  promptInjectionDetected: z.boolean(),
  promptInjectionWarnings: z.array(z.string()).default([]),
});
export type BerrInvestigationContext = z.infer<typeof BerrInvestigationContextSchema>;

/**
 * Compatibility ClassifiedFact shape consumed by existing tests & BEG UI
 */
export interface ClassifiedFact {
  id: string;
  dbId?: string;
  findingId?: string;
  field: string;
  claim?: string;
  classification: FactClassification;
  verificationState?: string;
  verificationMethod?: string;
  verificationAuthority?: string;
  verifiedAt?: string;
  buyerAssertion?: string;
  merchantAssertion?: string;
  independentProof?: string;
  buyerEvidenceIds?: string[];
  sellerEvidenceIds?: string[];
  supportingEvidenceIds: string[];
  linkedBegNodeIds?: string[];
  linkedBegEdgeIds?: string[];
  recommendedNextAction?: string;
  explanation: string;
  confidence: number;
  originalAiClassification?: FactClassification;
  originalAiExplanation?: string;
  humanReviewStatus?: "UNREVIEWED" | "ACCEPTED" | "REJECTED" | "CORRECTED";
  reviewedById?: string;
  reviewedAt?: string;
  humanOverrideReason?: string;
}

export interface BerrV2ReasoningOutput {
  assessmentId?: string;
  complaintId?: string;
  version?: number;
  isStale?: boolean;
  staleReason?: string | null;
  triggerReason?: string;
  createdAt?: string;
  assessmentStatus: "COMPLETED" | "INSUFFICIENT_BEG_DATA" | "FAILED";
  overallStatus: BerrOverallStatus;
  complaintTrack: BerrComplaintTrack;
  providerName?: string;
  modelName?: string;
  humanReviewStatus?: "UNREVIEWED" | "ACCEPTED" | "MODIFIED" | "ESCALATED";
  begGraphId?: string;
  begRevisionId?: string | null;
  begGraphVersion?: number;
  linkedBegNodeIds?: string[];
  linkedBegEdgeIds?: string[];
  caseId: string;
  classifiedFacts: ClassifiedFact[];
  findings: BerrStructuredFinding[];
  factCounts: {
    agreed: number;
    verified: number;
    contested: number;
    missing: number;
  };
  investigationContext: BerrInvestigationContext;
  recommendedNextActions: BerrRecommendedActionItem[];
  recommendedRemedyDetail: BerrRemedyReadiness;
  qualityReview: BerrQualityReviewResult;
  lifecycleSummary: string;
  recommendedRemedy: {
    type:
      | "REPLACEMENT"
      | "FULL_REFUND"
      | "PARTIAL_REFUND"
      | "RETURN_AND_REFUND"
      | "EVIDENCE_REQUEST";
    title: string;
    description: string;
    policyComplianceRate: number;
    financialSafetyApproved: boolean;
  };
  uncertaintyAnalysis: {
    establishedFacts: string[];
    remainingUncertainties: string[];
    riskScore: number;
    objectiveUncertaintyScore: number;
    requiresHumanReview: boolean;
  };
  metrics: {
    claimExtractionF1: number;
    evidenceAttributionAccuracy: number;
    contradictionPrecision: number;
    contradictionRecall: number;
    missingEvidenceRecall: number;
    evidenceTraceabilityCoverage: number;
    policyCompliance: number;
    humanEscalationAccuracy: number;
  };
}
