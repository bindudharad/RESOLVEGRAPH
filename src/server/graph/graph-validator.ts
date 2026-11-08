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

const ALLOWED_EDGE_CONNECTIONS: Record<
  GraphEdgeType,
  { allowedSources: GraphNodeType[]; allowedTargets: GraphNodeType[] }
> = {
  ASSERTS_CLAIM: {
    allowedSources: ["BUYER", "MERCHANT", "CASE"],
    allowedTargets: ["CLAIM"],
  },
  SUBMITS_EVIDENCE: {
    allowedSources: ["BUYER", "MERCHANT", "CASE"],
    allowedTargets: ["EVIDENCE"],
  },
  EXTRACTED_FROM: {
    allowedSources: ["FACT"],
    allowedTargets: ["EVIDENCE"],
  },
  ASSESSES_CLAIM: {
    allowedSources: ["FACT"],
    allowedTargets: ["CLAIM"],
  },
  RELATES_TO_FACT: {
    allowedSources: ["FACT"],
    allowedTargets: ["FACT"],
  },
  CITES_FACT: {
    allowedSources: ["FINDING"],
    allowedTargets: ["FACT"],
  },
  CITES_EVIDENCE: {
    allowedSources: ["FINDING"],
    allowedTargets: ["EVIDENCE"],
  },
  CORRESPONDS_TO_EVENT: {
    allowedSources: ["EVIDENCE", "CLAIM", "FACT", "CASE"],
    allowedTargets: ["TIMELINE_EVENT"],
  },
  GROUNDED_IN_FINDING: {
    allowedSources: ["RESOLUTION_PROPOSAL"],
    allowedTargets: ["FINDING"],
  },
  RESOLVES_CLAIM: {
    allowedSources: ["RESOLUTION_PROPOSAL"],
    allowedTargets: ["CLAIM"],
  },
  PROMISES_SPEC: {
    allowedSources: ["CASE"],
    allowedTargets: ["PURCHASE_MEMORY"],
  },
  PACKED_IN: {
    allowedSources: ["CASE"],
    allowedTargets: ["PACKAGE_PASSPORT"],
  },
  SEALED_WITH: {
    allowedSources: ["PACKAGE_PASSPORT"],
    allowedTargets: ["PACKAGE_SEAL"],
  },
  TRANSIT_VERIFIED: {
    allowedSources: ["PACKAGE_PASSPORT", "CASE"],
    allowedTargets: ["DELIVERY_EVENT"],
  },
  UNBOXED_IN_SESSION: {
    allowedSources: ["CASE"],
    allowedTargets: ["CAMERA_SESSION"],
  },
  PROCESSED_THROUGH: {
    allowedSources: ["CASE", "BUYER", "MERCHANT"],
    allowedTargets: ["CANONICAL_TRANSACTION"],
  },
  MATCHED_WITH: {
    allowedSources: ["CANONICAL_TRANSACTION"],
    allowedTargets: ["TRANSACTION_SOURCE", "EVIDENCE"],
  },
  RECONCILED_FROM: {
    allowedSources: ["CANONICAL_TRANSACTION"],
    allowedTargets: ["TRANSACTION_SOURCE"],
  },
  CONTRADICTED_BY: {
    allowedSources: ["RECONCILIATION_MISMATCH"],
    allowedTargets: ["CANONICAL_TRANSACTION", "TRANSACTION_SOURCE"],
  },
  EXPLAINS_INCIDENT: {
    allowedSources: ["INCIDENT_FINDING"],
    allowedTargets: ["CASE", "CANONICAL_TRANSACTION"],
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
      const edgeKey = `${edge.source}->${edge.target}:${edge.type}`;
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
