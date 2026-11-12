/**
 * RESOLVEGRAPH — Step 5: Advanced Bilateral Evidence Graph Types
 * Strongly typed node, edge, and query contracts for the Bilateral Evidence Graph.
 */

export type BegNodeType =
  // People and organizations
  | "BUYER"
  | "SELLER"
  | "MARKETPLACE"
  | "MERCHANT_ORGANIZATION"
  | "LOGISTICS_PROVIDER"
  // Purchase information
  | "COMPLAINT"
  | "ORDER"
  | "PRODUCT"
  | "PRODUCT_SPECIFICATION"
  | "PURCHASE_RECORD"
  | "INVOICE"
  | "PAYMENT_RECORD"
  // Buyer evidence
  | "BUYER_CLAIM"
  | "BUYER_IMAGE"
  | "BUYER_VIDEO"
  | "BUYER_DOCUMENT"
  | "BUYER_COMMUNICATION"
  // Seller evidence
  | "SELLER_CLAIM"
  | "SELLER_PACKING_PHOTO"
  | "SELLER_PACKING_VIDEO"
  | "SELLER_DECLARATION"
  | "SELLER_INSPECTION_RECORD"
  | "SELLER_DISPATCH_RECORD"
  | "SELLER_DOCUMENT"
  | "SELLER_COMMUNICATION"
  // Investigation information
  | "EXTRACTED_FACT"
  | "VERIFICATION_FINDING"
  | "EVIDENCE_REQUEST"
  | "EVIDENCE_RESPONSE"
  | "INVESTIGATION_EVENT"
  | "BERR_FINDING"
  | "RESOLUTION_PROPOSAL"
  | "MISSING_EVIDENCE"
  | "CONTRADICTION_FINDING";

export type BegEdgeType =
  | "SUBMITTED_BY"
  | "BELONGS_TO"
  | "PURCHASED_THROUGH"
  | "SOLD_BY"
  | "RELATES_TO_ORDER"
  | "DESCRIBES_PRODUCT"
  | "SUPPORTS_CLAIM"
  | "CONTRADICTS_CLAIM"
  | "EXTRACTED_FROM"
  | "VERIFIED_AGAINST"
  | "PACKED_BY"
  | "DISPATCHED_THROUGH"
  | "DELIVERED_TO"
  | "RESPONDED_TO"
  | "REQUESTED_FROM"
  | "MATCHED_WITH"
  | "RELATED_TO"
  | "INVESTIGATED_IN"
  | "SPECIFIES"
  | "SHOWS_OBSERVATION"
  | "STATES"
  | "MISSING_EVIDENCE";

export type EvidenceSourceOrigin =
  | "BUYER_SUBMITTED"
  | "SELLER_SUBMITTED"
  | "MARKETPLACE_SOURCED"
  | "LOGISTICS_SOURCED"
  | "SYSTEM_GENERATED"
  | "AI_EXTRACTED"
  | "INDEPENDENTLY_VERIFIED";

export type BegVerificationState =
  | "VERIFIED"
  | "SOURCE_SUPPORTED"
  | "INFERRED"
  | "CONTESTED"
  | "UNVERIFIED";

export type DiscrepancyState =
  | "CONSISTENT"
  | "INCONSISTENT"
  | "CONTESTED"
  | "MISSING"
  | "REQUIRES_REVIEW";

export type BegReviewAction =
  | "CONFIRM"
  | "REJECT"
  | "MARK_CONTESTED"
  | "REQUEST_ADDITIONAL_INFO"
  | "ESCALATE";

export interface SourceLocator {
  pageNumber?: number;
  section?: string;
  timestampStartSec?: number;
  timestampEndSec?: number;
  frameTimestamp?: string;
  boundingBox?: { x: number; y: number; w: number; h: number };
}

export interface EvidenceProvenanceRecord {
  evidenceId?: string;
  complaintId?: string;
  originalFileId?: string;
  evidenceType?: string;
  uploadedBy?: string;
  uploadingParty?: string;
  uploadTimestamp?: string;
  originalFilename?: string;
  sha256?: string;
  extractedInfoRef?: string;
  ocrResultRef?: string;
  verificationResultRef?: string;
  storageKey?: string;
  accessPermissions?: string;
  sourceOrigin?: EvidenceSourceOrigin;
  sourceLocator?: SourceLocator;
}

export type GraphNodeType =
  | BegNodeType
  | "CASE"
  | "BUYER"
  | "MERCHANT"
  | "PAYMENT_PROVIDER"
  | "BANK"
  | "CLAIM"
  | "EVIDENCE"
  | "FACT"
  | "FINDING"
  | "TIMELINE_EVENT"
  | "RESOLUTION_PROPOSAL"
  | "APPROVAL"
  | "PURCHASE_MEMORY"
  | "PACKAGE_PASSPORT"
  | "PACKAGE_SEAL"
  | "CAMERA_SESSION"
  | "DELIVERY_EVENT"
  | "CANONICAL_TRANSACTION"
  | "TRANSACTION_SOURCE"
  | "RECONCILIATION_MISMATCH"
  | "INCIDENT_FINDING"
  | "PAYPAL_ORDER"
  | "PAYPAL_CAPTURE"
  | "PAYPAL_REFUND"
  | "PAYPAL_DISPUTE"
  | "PROVIDER_EVENT"
  | "SELLER_IDENTITY"
  | "MARKETPLACE"
  | "SELLER_EVIDENCE_REQUEST"
  | "SELLER_RESPONSE"
  | "COMMUNICATION_EVENT";

export type GraphEdgeType =
  | BegEdgeType
  | "INITIATED_BY"
  | "PROCESSED_THROUGH"
  | "PAID_TO"
  | "CAPTURED_AS"
  | "MATCHED_WITH"
  | "DEBITED_FROM"
  | "CREDITED_TO"
  | "REFUNDED_BY"
  | "SUPPORTED_BY"
  | "CONTRADICTED_BY"
  | "BELONGS_TO_ORDER"
  | "VERIFIED_BY"
  | "INVESTIGATED_IN"
  | "PROPOSED_FOR"
  | "APPROVED_BY"
  | "EXECUTED_AS"
  | "ASSERTS_CLAIM"
  | "SUBMITS_EVIDENCE"
  | "EXTRACTED_FROM"
  | "ASSESSES_CLAIM"
  | "RELATES_TO_FACT"
  | "CITES_FACT"
  | "CITES_EVIDENCE"
  | "CORRESPONDS_TO_EVENT"
  | "GROUNDED_IN_FINDING"
  | "RESOLVES_CLAIM"
  | "PROMISES_SPEC"
  | "PACKED_IN"
  | "SEALED_WITH"
  | "TRANSIT_VERIFIED"
  | "UNBOXED_IN_SESSION"
  | "RECONCILED_FROM"
  | "EXPLAINS_INCIDENT"
  | "IDENTIFIES_SELLER"
  | "SOLICITS_EVIDENCE"
  | "RESPONDS_TO_REQUEST"
  | "COMMUNICATES_VIA";

export type FactRelationType =
  | "EQUIVALENT"
  | "CONTRADICTS"
  | "VARIANT_OF"
  | "SUPERSEDES"
  | "DEPENDS_ON"
  | "CONTEXT_FOR"
  | "TEMPORALLY_PRECEDES"
  | "UNRELATED"
  | "INSUFFICIENT_TO_ASSESS";

export type FactClaimRelationshipType =
  | "SUPPORTS"
  | "CONTRADICTS"
  | "PARTIALLY_SUPPORTS"
  | "MENTIONS"
  | "DOES_NOT_ADDRESS"
  | "INSUFFICIENT_TO_ASSESS";

export type ReviewStatus =
  | "UNREVIEWED"
  | "CONFIRMED"
  | "CORRECTED"
  | "REJECTED"
  | "INCONCLUSIVE"
  | "VERIFIED"
  | "CONTESTED"
  | "ADDITIONAL_INFO_REQUESTED"
  | "ESCALATED";

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  begType?: BegNodeType;
  sourceEntityType?: string;
  sourceEntityId?: string;
  label: string;
  sublabel?: string;
  party?: "BUYER" | "MERCHANT" | "SELLER" | "MARKETPLACE" | "LOGISTICS" | "SYSTEM" | "NEUTRAL";
  swimlane?: "BUYER" | "SHARED" | "SELLER";
  sourceOrigin?: EvidenceSourceOrigin;
  status?: string;
  confidence?: number;
  confidenceBand?: ConfidenceBand;
  reviewStatus?: ReviewStatus | "CONFIRMED" | "REJECTED" | "VERIFIED" | "CONTESTED" | "ADDITIONAL_INFO_REQUESTED" | "ESCALATED";
  verificationState?: BegVerificationState;
  discrepancyState?: DiscrepancyState;
  provenanceRecord?: EvidenceProvenanceRecord;
  timestamp?: string; // ISO-8601
  metadata: Record<string, unknown>;
  isRedacted?: boolean;
  isInternal?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  type: GraphEdgeType | BegEdgeType;
  begType?: BegEdgeType;
  label: string;
  weight?: number;
  confidence?: number;
  confidenceBand?: ConfidenceBand;
  reviewStatus?: ReviewStatus | "CONFIRMED" | "REJECTED" | "VERIFIED" | "CONTESTED" | "ADDITIONAL_INFO_REQUESTED" | "ESCALATED";
  verificationState?: BegVerificationState;
  sourceOrigin?: EvidenceSourceOrigin;
  provenance:
    | "RULE"
    | "AI_INFERRED"
    | "HUMAN_ASSERTED"
    | "SYSTEM_AUDIT"
    | "BUYER_SUBMITTED"
    | "MERCHANT_SUBMITTED"
    | "SELLER_SUBMITTED";
  matchMethod?: string;
  supportingEvidenceIds?: string[];
  originalAiState?: BegVerificationState;
  reviewedById?: string;
  reviewedAt?: string;
  reviewNote?: string;
  explanation?: string;
  metadata?: Record<string, unknown>;
  isInternal?: boolean;
}

export interface GraphSummaryMetrics {
  nodeCount: number;
  edgeCount: number;
  verifiedCount: number;
  sourceSupportedCount: number;
  inferredCount: number;
  contestedCount: number;
  unverifiedCount: number;
  missingCount: number;
  buyerNodeCount: number;
  sellerNodeCount: number;
  sharedNodeCount: number;
  discrepancies: Array<{
    key: string;
    attribute: string;
    state: DiscrepancyState;
    summary: string;
    buyerValue?: string;
    sellerValue?: string;
    orderValue?: string;
    involvedNodeIds: string[];
  }>;
  missingEvidenceGaps: Array<{
    key: string;
    nodeId: string;
    label: string;
    party: "BUYER" | "SELLER" | "SHARED";
    reason: string;
  }>;
  ambiguousMatches: Array<{
    key: string;
    description: string;
    candidateNames: string[];
    nodeIds: string[];
  }>;
}

export interface GraphData {
  caseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    graphId?: string;
    graphVersion: string;
    revisionNumber?: number;
    generatedAt: string;
    lastTriggerEvent?: string;
    integrityHash?: string;
    nodeCount: number;
    edgeCount: number;
    tenantScope: string;
    summary?: GraphSummaryMetrics;
  };
}

export interface GraphFilterOptions {
  nodeTypes?: GraphNodeType[];
  begNodeTypes?: BegNodeType[];
  edgeTypes?: GraphEdgeType[];
  parties?: Array<"BUYER" | "MERCHANT" | "SELLER" | "MARKETPLACE" | "LOGISTICS" | "SYSTEM" | "NEUTRAL">;
  sourceOrigins?: EvidenceSourceOrigin[];
  verificationStates?: BegVerificationState[];
  discrepancyStates?: DiscrepancyState[];
  reviewStatuses?: ReviewStatus[];
  minConfidence?: ConfidenceBand;
  searchQuery?: string;
  asOfTimestamp?: string;
}

export interface NodeNeighborhood {
  rootNode: GraphNode;
  directNeighbors: GraphNode[];
  incomingEdges: GraphEdge[];
  outgoingEdges: GraphEdge[];
  connectedFindings: GraphNode[];
}

export interface GraphProjectionTableItem {
  id: string;
  nodeType: GraphNodeType;
  label: string;
  party: string;
  inDegree: number;
  outDegree: number;
  reviewStatus: ReviewStatus;
  confidenceBand: ConfidenceBand;
  connectedNodes: Array<{ id: string; label: string; edgeType: GraphEdgeType }>;
}
