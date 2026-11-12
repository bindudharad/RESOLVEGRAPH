/**
 * RESOLVEGRAPH — Step 5: Graph Validator
 * Validates integrity, schema adherence, causal consistency, and cycle prevention.
 */

import {
  GraphData,
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphEdgeType,
} from "./graph.types";

export interface ValidationIssue {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  entityId?: string;
}

export interface GraphValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  metrics: {
    nodeCount: number;
    edgeCount: number;
    isolatedNodeCount: number;
    cycleDetected: boolean;
  };
}

const ALL_EVIDENCE_NODES: GraphNodeType[] = [
  "EVIDENCE",
  "INVOICE",
  "PAYMENT_RECORD",
  "PURCHASE_RECORD",
  "BUYER_IMAGE",
  "BUYER_VIDEO",
  "BUYER_DOCUMENT",
  "BUYER_COMMUNICATION",
  "SELLER_PACKING_PHOTO",
  "SELLER_PACKING_VIDEO",
  "SELLER_DECLARATION",
  "SELLER_INSPECTION_RECORD",
  "SELLER_DISPATCH_RECORD",
  "SELLER_DOCUMENT",
  "SELLER_COMMUNICATION",
  "PURCHASE_MEMORY",
  "PACKAGE_PASSPORT",
  "PACKAGE_SEAL",
  "CAMERA_SESSION",
  "TRANSACTION_SOURCE",
];

const ALL_ENTITY_PARTIES: GraphNodeType[] = [
  "BUYER",
  "SELLER",
  "MERCHANT",
  "MERCHANT_ORGANIZATION",
  "MARKETPLACE",
  "LOGISTICS_PROVIDER",
  "PAYMENT_PROVIDER",
  "BANK",
  "SELLER_IDENTITY",
  "CASE",
  "COMPLAINT",
];

const ALL_CLAIM_NODES: GraphNodeType[] = [
  "CLAIM",
  "BUYER_CLAIM",
  "SELLER_CLAIM",
  "COMPLAINT",
  "CASE",
];

const ALL_ORDER_NODES: GraphNodeType[] = [
  "ORDER",
  "PAYPAL_ORDER",
  "PURCHASE_MEMORY",
  "PURCHASE_RECORD",
  "CASE",
  "COMPLAINT",
];

const ALLOWED_EDGE_CONNECTIONS: Record<
  GraphEdgeType,
  { allowedSources: GraphNodeType[]; allowedTargets: GraphNodeType[] }
> = {
  ASSERTS_CLAIM: {
    allowedSources: ["BUYER", "MERCHANT", "SELLER", "CASE", "COMPLAINT"],
    allowedTargets: ["CLAIM", "BUYER_CLAIM", "SELLER_CLAIM"],
  },
  SUBMITS_EVIDENCE: {
    allowedSources: ["BUYER", "MERCHANT", "SELLER", "CASE", "COMPLAINT", "SELLER_RESPONSE", "EVIDENCE_RESPONSE"],
    allowedTargets: ALL_EVIDENCE_NODES,
  },
  EXTRACTED_FROM: {
    allowedSources: ["FACT", "EXTRACTED_FACT", "PRODUCT_SPECIFICATION", "VERIFICATION_FINDING", "SELLER_IDENTITY", "SELLER"],
    allowedTargets: [...ALL_EVIDENCE_NODES, "CLAIM", "BUYER_CLAIM", "SELLER_CLAIM"],
  },
  ASSESSES_CLAIM: {
    allowedSources: ["FACT", "EXTRACTED_FACT", "VERIFICATION_FINDING"],
    allowedTargets: ALL_CLAIM_NODES,
  },
  RELATES_TO_FACT: {
    allowedSources: ["FACT", "EXTRACTED_FACT", "PRODUCT_SPECIFICATION"],
    allowedTargets: ["FACT", "EXTRACTED_FACT", "PRODUCT_SPECIFICATION"],
  },
  CITES_FACT: {
    allowedSources: ["FINDING", "BERR_FINDING", "VERIFICATION_FINDING", "CONTRADICTION_FINDING"],
    allowedTargets: ["FACT", "EXTRACTED_FACT", "PRODUCT_SPECIFICATION"],
  },
  CITES_EVIDENCE: {
    allowedSources: ["FINDING", "BERR_FINDING", "VERIFICATION_FINDING", "CONTRADICTION_FINDING", "MISSING_EVIDENCE"],
    allowedTargets: ALL_EVIDENCE_NODES,
  },
  CORRESPONDS_TO_EVENT: {
    allowedSources: ["EVIDENCE", "CLAIM", "FACT", "CASE", "COMPLAINT", ...ALL_EVIDENCE_NODES],
    allowedTargets: ["TIMELINE_EVENT", "INVESTIGATION_EVENT"],
  },
  GROUNDED_IN_FINDING: {
    allowedSources: ["RESOLUTION_PROPOSAL"],
    allowedTargets: ["FINDING", "BERR_FINDING", "VERIFICATION_FINDING"],
  },
  RESOLVES_CLAIM: {
    allowedSources: ["RESOLUTION_PROPOSAL"],
    allowedTargets: ALL_CLAIM_NODES,
  },
  PROMISES_SPEC: {
    allowedSources: ["CASE", "COMPLAINT", "ORDER"],
    allowedTargets: ["PURCHASE_MEMORY", "PRODUCT_SPECIFICATION", "PRODUCT"],
  },
  PACKED_IN: {
    allowedSources: ["CASE", "COMPLAINT", "ORDER", "SELLER", "MERCHANT"],
    allowedTargets: ["PACKAGE_PASSPORT", "SELLER_PACKING_PHOTO", "SELLER_PACKING_VIDEO"],
  },
  SEALED_WITH: {
    allowedSources: ["PACKAGE_PASSPORT"],
    allowedTargets: ["PACKAGE_SEAL"],
  },
  TRANSIT_VERIFIED: {
    allowedSources: ["PACKAGE_PASSPORT", "CASE", "ORDER", "SELLER_DISPATCH_RECORD"],
    allowedTargets: ["DELIVERY_EVENT", "LOGISTICS_PROVIDER"],
  },
  UNBOXED_IN_SESSION: {
    allowedSources: ["CASE", "COMPLAINT", "ORDER"],
    allowedTargets: ["CAMERA_SESSION", "BUYER_VIDEO"],
  },
  PROCESSED_THROUGH: {
    allowedSources: ["CASE", "COMPLAINT", "ORDER", "BUYER", "MERCHANT", "SELLER", "CANONICAL_TRANSACTION", "PAYPAL_CAPTURE", "PAYPAL_ORDER", "PAYMENT_RECORD"],
    allowedTargets: ["CANONICAL_TRANSACTION", "PAYMENT_PROVIDER", "BANK", "PAYMENT_RECORD"],
  },
  INITIATED_BY: {
    allowedSources: ["BUYER", "PAYPAL_ORDER", "CANONICAL_TRANSACTION", "ORDER", "COMPLAINT"],
    allowedTargets: ["PAYPAL_ORDER", "ORDER", "CASE", "COMPLAINT", "BUYER"],
  },
  PAID_TO: {
    allowedSources: ["PAYPAL_CAPTURE", "CANONICAL_TRANSACTION", "PAYMENT_RECORD", "BUYER"],
    allowedTargets: ["MERCHANT", "SELLER", "MERCHANT_ORGANIZATION", "PAYMENT_PROVIDER"],
  },
  CAPTURED_AS: {
    allowedSources: ["PAYPAL_ORDER", "ORDER", "CANONICAL_TRANSACTION"],
    allowedTargets: ["PAYPAL_CAPTURE", "PAYMENT_RECORD", "CANONICAL_TRANSACTION"],
  },
  DEBITED_FROM: {
    allowedSources: ["CANONICAL_TRANSACTION", "TRANSACTION_SOURCE", "PAYMENT_RECORD"],
    allowedTargets: ["BUYER", "BANK"],
  },
  CREDITED_TO: {
    allowedSources: ["CANONICAL_TRANSACTION", "TRANSACTION_SOURCE", "PAYMENT_RECORD"],
    allowedTargets: ["MERCHANT", "SELLER", "MERCHANT_ORGANIZATION", "BANK"],
  },
  REFUNDED_BY: {
    allowedSources: ["PAYPAL_REFUND", "CANONICAL_TRANSACTION", "PAYMENT_RECORD"],
    allowedTargets: ["PAYPAL_CAPTURE", "CANONICAL_TRANSACTION", "CASE", "ORDER"],
  },
  SUPPORTED_BY: {
    allowedSources: ["CLAIM", "BUYER_CLAIM", "SELLER_CLAIM", "FINDING", "BERR_FINDING", "INCIDENT_FINDING"],
    allowedTargets: [...ALL_EVIDENCE_NODES, "FACT", "EXTRACTED_FACT", "CANONICAL_TRANSACTION", "PRODUCT_SPECIFICATION"],
  },
  CONTRADICTED_BY: {
    allowedSources: ["RECONCILIATION_MISMATCH", "PAYPAL_DISPUTE", "CLAIM", "BUYER_CLAIM", "SELLER_CLAIM", "FACT", "EXTRACTED_FACT", "PRODUCT_SPECIFICATION", "CONTRADICTION_FINDING"],
    allowedTargets: ["CANONICAL_TRANSACTION", "TRANSACTION_SOURCE", "PAYPAL_CAPTURE", "CLAIM", "BUYER_CLAIM", "SELLER_CLAIM", "FACT", "EXTRACTED_FACT", "PRODUCT_SPECIFICATION", ...ALL_EVIDENCE_NODES],
  },
  BELONGS_TO_ORDER: {
    allowedSources: ["PAYPAL_CAPTURE", "CANONICAL_TRANSACTION", "PACKAGE_PASSPORT", ...ALL_EVIDENCE_NODES],
    allowedTargets: ALL_ORDER_NODES,
  },
  VERIFIED_BY: {
    allowedSources: [...ALL_EVIDENCE_NODES, "FACT", "EXTRACTED_FACT", "CANONICAL_TRANSACTION", "SELLER", "SELLER_IDENTITY"],
    allowedTargets: ["PAYMENT_PROVIDER", "BANK", "CASE", "VERIFICATION_FINDING", "MERCHANT_ORGANIZATION"],
  },
  INVESTIGATED_IN: {
    allowedSources: [...ALL_CLAIM_NODES, ...ALL_EVIDENCE_NODES, "CANONICAL_TRANSACTION", "BERR_FINDING", "VERIFICATION_FINDING", "CONTRADICTION_FINDING", "EXTRACTED_FACT"],
    allowedTargets: ["CASE", "COMPLAINT", "BERR_FINDING", "INVESTIGATION_EVENT"],
  },
  PROPOSED_FOR: {
    allowedSources: ["RESOLUTION_PROPOSAL"],
    allowedTargets: ["CASE", "COMPLAINT"],
  },
  APPROVED_BY: {
    allowedSources: ["APPROVAL", "RESOLUTION_PROPOSAL"],
    allowedTargets: ["MERCHANT", "SELLER", "BUYER"],
  },
  EXECUTED_AS: {
    allowedSources: ["APPROVAL", "RESOLUTION_PROPOSAL"],
    allowedTargets: ["PAYPAL_REFUND", "CANONICAL_TRANSACTION", "PAYMENT_RECORD"],
  },
  MATCHED_WITH: {
    allowedSources: ["CANONICAL_TRANSACTION", "SELLER", "SELLER_IDENTITY", "MERCHANT_ORGANIZATION", "ORDER", ...ALL_EVIDENCE_NODES],
    allowedTargets: ["TRANSACTION_SOURCE", "EVIDENCE", "SELLER", "SELLER_IDENTITY", "MERCHANT_ORGANIZATION", "ORDER", ...ALL_EVIDENCE_NODES],
  },
  RECONCILED_FROM: {
    allowedSources: ["CANONICAL_TRANSACTION", "PAYMENT_RECORD"],
    allowedTargets: ["TRANSACTION_SOURCE", ...ALL_EVIDENCE_NODES],
  },
  EXPLAINS_INCIDENT: {
    allowedSources: ["INCIDENT_FINDING", "BERR_FINDING", "CONTRADICTION_FINDING"],
    allowedTargets: ["CASE", "COMPLAINT", "CANONICAL_TRANSACTION"],
  },
  IDENTIFIES_SELLER: {
    allowedSources: [...ALL_EVIDENCE_NODES, "CASE", "COMPLAINT", "ORDER", "SELLER_IDENTITY", "SELLER"],
    allowedTargets: ["SELLER_IDENTITY", "SELLER", "MERCHANT_ORGANIZATION", "MARKETPLACE"],
  },
  SOLICITS_EVIDENCE: {
    allowedSources: ["CASE", "COMPLAINT", "SELLER_EVIDENCE_REQUEST", "EVIDENCE_REQUEST"],
    allowedTargets: ["SELLER_EVIDENCE_REQUEST", "EVIDENCE_REQUEST", "SELLER_IDENTITY", "SELLER", "MARKETPLACE"],
  },
  RESPONDS_TO_REQUEST: {
    allowedSources: ["SELLER_RESPONSE", "EVIDENCE_RESPONSE", "MERCHANT", "SELLER", ...ALL_EVIDENCE_NODES],
    allowedTargets: ["SELLER_EVIDENCE_REQUEST", "EVIDENCE_REQUEST", ...ALL_CLAIM_NODES, "SELLER_RESPONSE", "EVIDENCE_RESPONSE"],
  },
  COMMUNICATES_VIA: {
    allowedSources: ["SELLER_EVIDENCE_REQUEST", "EVIDENCE_REQUEST", "COMMUNICATION_EVENT", "BUYER_COMMUNICATION", "SELLER_COMMUNICATION"],
    allowedTargets: ["COMMUNICATION_EVENT", "BUYER_COMMUNICATION", "SELLER_COMMUNICATION", "SELLER_IDENTITY", "SELLER", "MARKETPLACE", "BUYER"],
  },
  // Part 3.2 Canonical BEG Edge Types
  SUBMITTED_BY: {
    allowedSources: ["COMPLAINT", "CASE", ...ALL_CLAIM_NODES, ...ALL_EVIDENCE_NODES, "EVIDENCE_RESPONSE", "SELLER_RESPONSE"],
    allowedTargets: ALL_ENTITY_PARTIES,
  },
  BELONGS_TO: {
    allowedSources: [...ALL_CLAIM_NODES, ...ALL_EVIDENCE_NODES, "ORDER", "PRODUCT", "PRODUCT_SPECIFICATION", "EXTRACTED_FACT", "SELLER", "SELLER_IDENTITY", "MERCHANT"],
    allowedTargets: ["CASE", "COMPLAINT", "ORDER", "MERCHANT_ORGANIZATION", "MARKETPLACE", "SELLER", "SELLER_RESPONSE", "EVIDENCE_RESPONSE"],
  },
  PURCHASED_THROUGH: {
    allowedSources: ["ORDER", "COMPLAINT", "CASE", "BUYER", "PURCHASE_RECORD"],
    allowedTargets: ["MARKETPLACE", "SELLER", "MERCHANT_ORGANIZATION", "MERCHANT"],
  },
  SOLD_BY: {
    allowedSources: ["ORDER", "PRODUCT", "INVOICE", "PURCHASE_RECORD", "COMPLAINT", "CASE"],
    allowedTargets: ["SELLER", "MERCHANT", "MERCHANT_ORGANIZATION", "SELLER_IDENTITY"],
  },
  RELATES_TO_ORDER: {
    allowedSources: ["CASE", "COMPLAINT", ...ALL_CLAIM_NODES, ...ALL_EVIDENCE_NODES, "INVOICE", "PAYMENT_RECORD", "EVIDENCE_RESPONSE"],
    allowedTargets: ALL_ORDER_NODES,
  },
  DESCRIBES_PRODUCT: {
    allowedSources: ["ORDER", "COMPLAINT", "CASE", "INVOICE", "PURCHASE_RECORD", ...ALL_EVIDENCE_NODES],
    allowedTargets: ["PRODUCT", "PRODUCT_SPECIFICATION", "PURCHASE_MEMORY"],
  },
  SUPPORTS_CLAIM: {
    allowedSources: [...ALL_EVIDENCE_NODES, "EXTRACTED_FACT", "FACT", "VERIFICATION_FINDING", "PRODUCT_SPECIFICATION", "ORDER", "PAYMENT_RECORD"],
    allowedTargets: ALL_CLAIM_NODES,
  },
  CONTRADICTS_CLAIM: {
    allowedSources: [...ALL_EVIDENCE_NODES, "EXTRACTED_FACT", "FACT", "VERIFICATION_FINDING", "PRODUCT_SPECIFICATION", "CONTRADICTION_FINDING", "ORDER"],
    allowedTargets: [...ALL_CLAIM_NODES, "PRODUCT_SPECIFICATION", ...ALL_EVIDENCE_NODES],
  },
  VERIFIED_AGAINST: {
    allowedSources: [...ALL_EVIDENCE_NODES, "SELLER", "SELLER_IDENTITY", "EXTRACTED_FACT", "ORDER", "PRODUCT_SPECIFICATION"],
    allowedTargets: ["SELLER_INSPECTION_RECORD", "MERCHANT_ORGANIZATION", "VERIFICATION_FINDING", "ORDER", "PRODUCT_SPECIFICATION", ...ALL_EVIDENCE_NODES],
  },
  PACKED_BY: {
    allowedSources: ["ORDER", "PACKAGE_PASSPORT", "SELLER_PACKING_PHOTO", "SELLER_PACKING_VIDEO", "SELLER_DISPATCH_RECORD"],
    allowedTargets: ["SELLER", "MERCHANT", "MERCHANT_ORGANIZATION", "SELLER_IDENTITY"],
  },
  DISPATCHED_THROUGH: {
    allowedSources: ["ORDER", "PACKAGE_PASSPORT", "SELLER_DISPATCH_RECORD", "SELLER"],
    allowedTargets: ["LOGISTICS_PROVIDER", "DELIVERY_EVENT"],
  },
  DELIVERED_TO: {
    allowedSources: ["LOGISTICS_PROVIDER", "SELLER_DISPATCH_RECORD", "DELIVERY_EVENT", "ORDER"],
    allowedTargets: ["BUYER", "COMPLAINT", "CASE"],
  },
  RESPONDED_TO: {
    allowedSources: ["EVIDENCE_RESPONSE", "SELLER_RESPONSE", "SELLER", "MERCHANT", "SELLER_DECLARATION"],
    allowedTargets: ["EVIDENCE_REQUEST", "SELLER_EVIDENCE_REQUEST", "COMPLAINT", "CASE", "SELLER_RESPONSE", "EVIDENCE_RESPONSE"],
  },
  REQUESTED_FROM: {
    allowedSources: ["EVIDENCE_REQUEST", "SELLER_EVIDENCE_REQUEST", "CASE", "COMPLAINT"],
    allowedTargets: ["SELLER", "MERCHANT", "SELLER_IDENTITY", "MARKETPLACE"],
  },
  RELATED_TO: {
    allowedSources: ["CASE", "COMPLAINT", "ORDER", "PRODUCT", "PRODUCT_SPECIFICATION", ...ALL_EVIDENCE_NODES, "EXTRACTED_FACT", "VERIFICATION_FINDING", "CONTRADICTION_FINDING", "MISSING_EVIDENCE", "BERR_FINDING", "RESOLUTION_PROPOSAL"],
    allowedTargets: ["CASE", "COMPLAINT", "ORDER", "PRODUCT", "PRODUCT_SPECIFICATION", ...ALL_EVIDENCE_NODES, "EXTRACTED_FACT", "VERIFICATION_FINDING", "CONTRADICTION_FINDING", "MISSING_EVIDENCE", "BERR_FINDING", "RESOLUTION_PROPOSAL", "SELLER", "BUYER"],
  },
  SPECIFIES: {
    allowedSources: ["ORDER", "INVOICE", "PURCHASE_RECORD", "PRODUCT", "SELLER_DECLARATION", "COMPLAINT", ...ALL_EVIDENCE_NODES],
    allowedTargets: ["PRODUCT_SPECIFICATION", "PRODUCT"],
  },
  SHOWS_OBSERVATION: {
    allowedSources: [...ALL_EVIDENCE_NODES],
    allowedTargets: ["EXTRACTED_FACT", "PRODUCT_SPECIFICATION", "VERIFICATION_FINDING", "CONTRADICTION_FINDING"],
  },
  STATES: {
    allowedSources: ["SELLER_DECLARATION", "SELLER_CLAIM", "BUYER_CLAIM", "SELLER_RESPONSE", "EVIDENCE_RESPONSE"],
    allowedTargets: ["PRODUCT_SPECIFICATION", "EXTRACTED_FACT", "ORDER", ...ALL_CLAIM_NODES],
  },
  MISSING_EVIDENCE: {
    allowedSources: ["CASE", "COMPLAINT", "ORDER", "BERR_FINDING", "VERIFICATION_FINDING"],
    allowedTargets: ["MISSING_EVIDENCE", "PRODUCT_SPECIFICATION", ...ALL_CLAIM_NODES],
  },
};

export class GraphValidator {
  /**
   * Validates a complete GraphData structure.
   */
  public static validate(graph: GraphData): GraphValidationResult {
    const issues: ValidationIssue[] = [];
    const nodeMap = new Map<string, GraphNode>();
    const edgeKeySet = new Set<string>();

    // 1. Verify unique nodes
    for (const node of graph.nodes) {
      if (nodeMap.has(node.id)) {
        issues.push({
          severity: "ERROR",
          code: "DUPLICATE_NODE_ID",
          message: `Duplicate node ID detected: ${node.id}`,
          entityId: node.id,
        });
      } else {
        nodeMap.set(node.id, node);
      }
    }

    // Track in/out degrees
    const inDegrees = new Map<string, number>();
    const outDegrees = new Map<string, number>();
    for (const nodeId of nodeMap.keys()) {
      inDegrees.set(nodeId, 0);
      outDegrees.set(nodeId, 0);
    }

    // 2. Validate edges
    for (const edge of graph.edges) {
      // Check duplicate edges
      const edgeKey = `${edge.source}->${edge.target}:${edge.type}:${edge.label || ""}`;
      if (edgeKeySet.has(edgeKey)) {
        issues.push({
          severity: "WARNING",
          code: "DUPLICATE_EDGE",
          message: `Redundant edge between ${edge.source} and ${edge.target} of type ${edge.type}`,
          entityId: edge.id,
        });
      } else {
        edgeKeySet.add(edgeKey);
      }

      // Enforce provenance guardrail: unconfirmed AI inferences must never masquerade as VERIFIED
      if (
        (edge.provenance === "AI_INFERRED" || edge.sourceOrigin === "AI_EXTRACTED") &&
        edge.verificationState === "VERIFIED" &&
        edge.reviewStatus !== "CONFIRMED" &&
        edge.reviewStatus !== "VERIFIED"
      ) {
        issues.push({
          severity: "WARNING",
          code: "AI_INFERENCE_AUTO_VERIFIED",
          message: `Edge ${edge.id} (${edge.type}) originates from AI inference/extraction without human or independent verification.`,
          entityId: edge.id,
        });
      }

      // Check self-loops
      if (edge.source === edge.target) {
        issues.push({
          severity: "ERROR",
          code: "SELF_LOOP_DETECTED",
          message: `Self-loop detected on node ${edge.source}`,
          entityId: edge.id,
        });
      }

      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode) {
        issues.push({
          severity: "ERROR",
          code: "DANGLING_EDGE_SOURCE",
          message: `Edge ${edge.id} references non-existent source node: ${edge.source}`,
          entityId: edge.id,
        });
      }

      if (!targetNode) {
        issues.push({
          severity: "ERROR",
          code: "DANGLING_EDGE_TARGET",
          message: `Edge ${edge.id} references non-existent target node: ${edge.target}`,
          entityId: edge.id,
        });
      }

      if (sourceNode && targetNode) {
        // Check allowed connection types
        const allowed = ALLOWED_EDGE_CONNECTIONS[edge.type];
        if (allowed) {
          if (!allowed.allowedSources.includes(sourceNode.type)) {
            issues.push({
              severity: "ERROR",
              code: "INVALID_EDGE_SOURCE_TYPE",
              message: `Edge type ${edge.type} cannot originate from node type ${sourceNode.type}`,
              entityId: edge.id,
            });
          }
          if (!allowed.allowedTargets.includes(targetNode.type)) {
            issues.push({
              severity: "ERROR",
              code: "INVALID_EDGE_TARGET_TYPE",
              message: `Edge type ${edge.type} cannot point to node type ${targetNode.type}`,
              entityId: edge.id,
            });
          }
        }

        // Increment degree counters
        outDegrees.set(edge.source, (outDegrees.get(edge.source) || 0) + 1);
        inDegrees.set(edge.target, (inDegrees.get(edge.target) || 0) + 1);
      }
    }

    // 3. Count isolated nodes (excluding root CASE node which might be standalone in empty case)
    let isolatedCount = 0;
    for (const [nodeId, node] of nodeMap.entries()) {
      const inDeg = inDegrees.get(nodeId) || 0;
      const outDeg = outDegrees.get(nodeId) || 0;
      if (inDeg === 0 && outDeg === 0 && node.type !== "CASE") {
        isolatedCount++;
        issues.push({
          severity: "WARNING",
          code: "ISOLATED_NODE",
          message: `Node ${node.id} (${node.type}: ${node.label}) is disconnected from the graph.`,
          entityId: nodeId,
        });
      }
    }

    // 4. Cycle detection in fact-dependency subgraphs
    const cycleDetected = this.detectCyclesInFactRelations(graph.edges);
    if (cycleDetected) {
      issues.push({
        severity: "ERROR",
        code: "CIRCULAR_DEPENDENCY_DETECTED",
        message: "Circular dependency detected in SUPERSEDES or DEPENDS_ON fact relations.",
      });
    }

    const hasErrors = issues.some((i) => i.severity === "ERROR");

    return {
      isValid: !hasErrors,
      issues,
      metrics: {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        isolatedNodeCount: isolatedCount,
        cycleDetected,
      },
    };
  }

  /**
   * Detects circular dependencies in directed fact relations (SUPERSEDES, DEPENDS_ON)
   */
  private static detectCyclesInFactRelations(edges: GraphEdge[]): boolean {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      if (
        edge.type === "RELATES_TO_FACT" &&
        (edge.label === "SUPERSEDES" || edge.label === "DEPENDS_ON")
      ) {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push(edge.target);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (curr: string): boolean => {
      visited.add(curr);
      recStack.add(curr);

      const neighbors = adj.get(curr) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          if (dfs(next)) return true;
        } else if (recStack.has(next)) {
          return true; // Cycle found
        }
      }

      recStack.delete(curr);
      return false;
    };

    for (const node of adj.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }

    return false;
  }
}
