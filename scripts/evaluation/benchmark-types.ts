/**
 * RECOURSE-BENCH Formal Evaluation Benchmark Types
 * 
 * Formal dataset schema and evaluation types for commerce dispute investigation,
 * bilateral evidence reconciliation, and resolution intelligence.
 */

export type DisputeCategory =
  | 'Wrong Product'
  | 'Product Not as Described'
  | 'Item Not Received'
  | 'Damaged Product'
  | 'Defective Product'
  | 'Refund Pending'
  | 'Return Denied'
  | 'Duplicate Payment'
  | 'Shipping Charge Dispute'
  | 'Warranty Dispute'
  | 'Seller Identity Disagreement'
  | 'Payment Mismatch'
  | 'Delivery Confirmation Conflict'
  | 'Incomplete Evidence'
  | 'Contradictory Communication'
  | 'Approved Modification'
  | 'Unauthorized Modification'
  | 'Ambiguous Merchant Policy'
  | 'Benign Formatting Difference'
  | 'Prompt-Injection Attempt';

export type DisputePerspective =
  | 'BUYER_CORRECT'
  | 'MERCHANT_CORRECT'
  | 'BOTH_PARTIALLY_CORRECT'
  | 'EVIDENCE_INSUFFICIENT'
  | 'NEITHER_VERIFIABLE'
  | 'MISUNDERSTANDING'
  | 'LEGITIMATE_POLICY_EXCEPTION'
  | 'CONFLICTING_RECORDS_HUMAN_NEEDED';

export type ClaimEvidenceRelationship =
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'PARTIALLY_SUPPORTS'
  | 'MENTIONS'
  | 'DOES_NOT_ADDRESS'
  | 'INSUFFICIENT_TO_ASSESS';

export type ResolutionRemedy =
  | 'FULL_REFUND'
  | 'PARTIAL_REFUND'
  | 'REPLACEMENT'
  | 'STORE_CREDIT'
  | 'RETURN_FOR_REFUND'
  | 'REJECT_CLAIM'
  | 'REQUEST_MORE_EVIDENCE'
  | 'HUMAN_REVIEW_REQUIRED';

export interface SyntheticEvidenceRef {
  id: string;
  filename: string;
  evidenceType: 'INVOICE' | 'TRACKING_PROOF' | 'DAMAGE_PHOTO' | 'CUSTOMER_CHAT' | 'PACKAGING_PHOTO' | 'RETURN_RECEIPT';
  uploaderRole: 'BUYER' | 'MERCHANT' | 'CARRIER';
  description: string;
  extractedFacts: Array<{
    fieldKey: string;
    rawValue: string;
    normalizedValue: string;
    isSubjective?: boolean;
    confidence: number;
  }>;
}

export interface SyntheticEvent {
  timestamp: string;
  eventType: string;
  actor: 'BUYER' | 'MERCHANT' | 'CARRIER' | 'SYSTEM';
  description: string;
}

export interface SyntheticPolicy {
  policyName: string;
  returnWindowDays: number;
  conditionRequired: 'UNOPENED' | 'ORIGINAL_CONDITION' | 'DAMAGED_ALLOWED';
  restockingFeePercent: number;
  fullRefundAllowed: boolean;
  replacementAllowed: boolean;
  exceptionCriteria?: string[];
}

export interface RecourseCase {
  id: string;
  caseNumber: string;
  title: string;
  category: DisputeCategory;
  perspective: DisputePerspective;
  description: string;
  buyerClaim: {
    statement: string;
    claimedRemedy: ResolutionRemedy;
    claimedAmountMinor: number;
  };
  merchantClaim: {
    statement: string;
    disputed: boolean;
    counterRemedy?: ResolutionRemedy;
  };
  originalPurchaseInfo: {
    orderNumber: string;
    orderDate: string;
    itemTitle: string;
    sku: string;
    amountMinor: number;
    currency: string;
  };
  evidenceReferences: SyntheticEvidenceRef[];
  eventHistory: SyntheticEvent[];
  applicablePolicy: SyntheticPolicy;
  groundTruth: {
    expectedClaimLabels: Record<string, ClaimEvidenceRelationship>;
    expectedMissingInformation: string[];
    expectedDiscrepancyScoreRange: [number, number]; // [min, max]
    coreContradictionExpected: boolean;
    acceptableResolutionPaths: ResolutionRemedy[];
    requiresHumanEscalation: boolean;
    justification: string;
  };
}

export interface BenchmarkDataset {
  version: string;
  createdAt: string;
  totalCases: number;
  categories: Record<DisputeCategory, number>;
  perspectives: Record<DisputePerspective, number>;
  cases: RecourseCase[];
}

export interface SubsystemMetrics {
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  sampleCount: number;
  latencyMs: number;
}

export interface BaselineComparisonResult {
  baselineName: string;
  paradigm: string;
  citationAccuracy: number;
  hallucinationRate: number;
  policyCompliance: number;
  financialSafetyCompliance: number;
  missingEvidenceF1: number;
  contradictionF1: number;
  orderSymmetryScore: number;
  avgLatencyMs: number;
  tokenCostEstimateUsd: number;
}

export interface AblationResult {
  configuration: string;
  disabledComponent: string;
  citationAccuracy: number;
  hallucinationRate: number;
  contradictionF1: number;
  policyCompliance: number;
  latencyMs: number;
  deltaAccuracyVsFull: number;
}
