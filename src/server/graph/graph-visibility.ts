/**
 * RESOLVEGRAPH — Step 5: Graph Visibility & Scoping Service
 * Enforces role-based filtering, organization boundaries, and redaction on graph projections.
 */

import { GraphData, GraphNode, GraphEdge } from "./graph.types";
import { UserRole } from "@/generated/prisma/client";

export interface UserContext {
  userId: string;
  role: UserRole;
  isPlatformAdmin?: boolean;
  organizationId?: string | null;
}

export class GraphVisibilityService {
  /**
   * Applies role and organization scoping to a GraphData instance.
   * Modifies graph projection safely without altering underlying database records.
   */
  public static filterForUser(graph: GraphData, user: UserContext): GraphData {
    // Platform admins have full visibility
    if (user.isPlatformAdmin) {
      return graph;
    }

    const visibleNodeIds = new Set<string>();
    const filteredNodes: GraphNode[] = [];

    for (const node of graph.nodes) {
      const isVisible = this.isNodeVisibleToUser(node, user);
      if (isVisible) {
        visibleNodeIds.add(node.id);
        const transformedNode = this.sanitizeNodeForUser(node, user);
        filteredNodes.push(transformedNode);
      }
    }

    // Filter edges to only include those where both endpoints are visible
    const filteredEdges: GraphEdge[] = [];
    for (const edge of graph.edges) {
      if (visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)) {
        filteredEdges.push(edge);
      }
    }

    return {
      caseId: graph.caseId,
      nodes: filteredNodes,
      edges: filteredEdges,
      metadata: {
        ...graph.metadata,
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
        tenantScope: user.role === "MERCHANT" ? user.organizationId || "MERCHANT" : user.role,
      },
    };
  }

  private static isNodeVisibleToUser(node: GraphNode, user: UserContext): boolean {
    const isInternal = Boolean(node.isInternal || node.metadata?.isInternal);

    // Internal notes, private investigator findings, and internal evidence are hidden from buyers and non-investigator merchants
    if ((user.role === "BUYER" || user.role === "MERCHANT") && isInternal) {
      return false;
    }

    // Hide raw buyer-only evidence and seller identity internals from unauthorized non-admins
    if (user.role === "BUYER" && (node.begType === "SELLER_COMMUNICATION" || node.begType === "SELLER_INSPECTION_RECORD")) {
      return false;
    }

    // Strict seller org boundary check
    const nodeOrgId = node.metadata?.organizationId as string | undefined;
    if (user.role === "MERCHANT" && nodeOrgId && user.organizationId) {
      if (nodeOrgId !== user.organizationId) {
        return false;
      }
    }

    return true;
  }

  private static sanitizeNodeForUser(node: GraphNode, user: UserContext): GraphNode {
    if (user.role === "BUYER" || user.role === "MERCHANT") {
      const safeMetadata = { ...node.metadata };
      delete safeMetadata.merchantInternalNotes;
      delete safeMetadata.investigatorNotes;
      delete safeMetadata.internalScore;
      delete safeMetadata.rawPrompt;
      if (user.role === "MERCHANT" && node.party === "BUYER") {
        delete safeMetadata.email;
      }

      return {
        ...node,
        metadata: safeMetadata,
      };
    }

    return node;
  }
}
