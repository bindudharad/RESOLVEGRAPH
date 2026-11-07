/**
 * RESOLVEGRAPH — Step 5: Advanced Bilateral Evidence Graph Types
 * Strongly typed node, edge, and query contracts for the Bilateral Evidence Graph.
 */

export type GraphNodeType =
  | "CASE"
  | "BUYER"
  | "MERCHANT"
  | "CLAIM"
  | "EVIDENCE"
  | "FACT"
  | "FINDING"
  | "TIMELINE_EVENT"
  | "RESOLUTION_PROPOSAL"
  | "PURCHASE_MEMORY"
  | "PACKAGE_PASSPORT"
  | "PACKAGE_SEAL"
  | "CAMERA_SESSION"
  | "DELIVERY_EVENT";

export type GraphEdgeType =
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
  | "UNBOXED_IN_SESSION";

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
  | "INCONCLUSIVE";

export type ConfidenceBand = "HIGH" | "MEDIUM" | "LOW";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  sublabel?: string;
  party?: "BUYER" | "MERCHANT" | "SYSTEM" | "NEUTRAL";
  status?: string;
  confidence?: number;
  confidenceBand?: ConfidenceBand;
  reviewStatus?: ReviewStatus;
  timestamp?: string; // ISO-8601
  metadata: Record<string, unknown>;
  isRedacted?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string; // source node id
  target: string; // target node id
  type: GraphEdgeType;
  label: string;
  weight?: number;
  confidenceBand?: ConfidenceBand;
  reviewStatus?: ReviewStatus;
  provenance: "RULE" | "AI_INFERRED" | "HUMAN_ASSERTED" | "SYSTEM_AUDIT";
  explanation?: string;
  metadata?: Record<string, unknown>;
}

export interface GraphData {
  caseId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    graphVersion: string;
    generatedAt: string;
    nodeCount: number;
    edgeCount: number;
    tenantScope: string;
  };
}

export interface GraphFilterOptions {
  nodeTypes?: GraphNodeType[];
  edgeTypes?: GraphEdgeType[];
  parties?: Array<"BUYER" | "MERCHANT" | "SYSTEM" | "NEUTRAL">;
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
