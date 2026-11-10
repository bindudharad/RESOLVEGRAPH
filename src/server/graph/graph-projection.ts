/**
 * RESOLVEGRAPH — Step 5: Graph Projection Service
 * Provides tabular and visual layout projections for UI exploration and accessibility.
 */

import {
  GraphData,
  GraphNode,
  GraphNodeType,
  GraphProjectionTableItem,
} from "./graph.types";

export interface VisualGraphNode extends GraphNode {
  x: number;
  y: number;
  color: string;
}

export interface VisualGraphLayout {
  width: number;
  height: number;
  nodes: VisualGraphNode[];
  edges: GraphData["edges"];
}

const NODE_COLORS: Record<GraphNodeType, string> = {
  CASE: "#a855f7", // Purple
  BUYER: "#3b82f6", // Blue
  MERCHANT: "#10b981", // Emerald
  CLAIM: "#f59e0b", // Amber
  EVIDENCE: "#06b6d4", // Cyan
  FACT: "#6366f1", // Indigo
  FINDING: "#ef4444", // Rose / Red
  TIMELINE_EVENT: "#8b5cf6", // Violet
  RESOLUTION_PROPOSAL: "#14b8a6", // Teal
  PURCHASE_MEMORY: "#38bdf8", // Sky
  PACKAGE_PASSPORT: "#818cf8", // Light Indigo
  PACKAGE_SEAL: "#34d399", // Mint
  CAMERA_SESSION: "#fb923c", // Orange
  DELIVERY_EVENT: "#a78bfa", // Lavender
  CANONICAL_TRANSACTION: "#059669", // Dark Emerald
  TRANSACTION_SOURCE: "#0284c7", // Dark Sky
  RECONCILIATION_MISMATCH: "#dc2626", // Bright Red
  INCIDENT_FINDING: "#d97706", // Amber
  PAYMENT_PROVIDER: "#0284c7", // Sky blue
  BANK: "#0d9488", // Teal
  APPROVAL: "#10b981", // Emerald
  PAYPAL_ORDER: "#0284c7", // Sky
  PAYPAL_CAPTURE: "#059669", // Dark Emerald
  PAYPAL_REFUND: "#6366f1", // Indigo
  PAYPAL_DISPUTE: "#f59e0b", // Amber
  PROVIDER_EVENT: "#64748b", // Slate
};

const TIER_ORDER: Record<GraphNodeType, number> = {
  BUYER: 0,
  MERCHANT: 0,
  CASE: 1,
  PURCHASE_MEMORY: 1,
  CANONICAL_TRANSACTION: 1,
  PAYMENT_PROVIDER: 1,
  BANK: 1,
  PAYPAL_ORDER: 2,
  PAYPAL_CAPTURE: 2,
  PAYPAL_DISPUTE: 2,
  TRANSACTION_SOURCE: 2,
  CLAIM: 2,
  EVIDENCE: 2,
  PACKAGE_PASSPORT: 2,
  PACKAGE_SEAL: 2,
  CAMERA_SESSION: 2,
  PAYPAL_REFUND: 3,
  PROVIDER_EVENT: 3,
  RECONCILIATION_MISMATCH: 3,
  DELIVERY_EVENT: 3,
  FACT: 3,
  FINDING: 4,
  INCIDENT_FINDING: 4,
  TIMELINE_EVENT: 4,
  APPROVAL: 5,
  RESOLUTION_PROPOSAL: 5,
};

export class GraphProjectionService {
  /**
   * Projects graph into an accessible tabular format for screen readers and table views.
   */
  public static projectToTable(graph: GraphData): GraphProjectionTableItem[] {
    const inDegrees = new Map<string, number>();
    const outDegrees = new Map<string, number>();
    const nodeMap = new Map<string, GraphNode>();
    const connections = new Map<
      string,
      Array<{ id: string; label: string; edgeType: GraphData["edges"][0]["type"] }>
    >();

    for (const node of graph.nodes) {
      inDegrees.set(node.id, 0);
      outDegrees.set(node.id, 0);
      nodeMap.set(node.id, node);
      connections.set(node.id, []);
    }

    for (const edge of graph.edges) {
      outDegrees.set(edge.source, (outDegrees.get(edge.source) || 0) + 1);
      inDegrees.set(edge.target, (inDegrees.get(edge.target) || 0) + 1);

      const targetNode = nodeMap.get(edge.target);
      if (targetNode) {
        connections.get(edge.source)?.push({
          id: targetNode.id,
          label: targetNode.label,
          edgeType: edge.type,
        });
      }
    }

    return graph.nodes.map((node) => ({
      id: node.id,
      nodeType: node.type,
      label: node.label,
      party: node.party || "NEUTRAL",
      inDegree: inDegrees.get(node.id) || 0,
      outDegree: outDegrees.get(node.id) || 0,
      reviewStatus: node.reviewStatus || "UNREVIEWED",
      confidenceBand: node.confidenceBand || "HIGH",
      connectedNodes: connections.get(node.id) || [],
    }));
  }

  /**
   * Deterministically calculates 2D coordinates for visual rendering in SVG or canvas.
   */
  public static projectToVisualLayout(
    graph: GraphData,
    width = 1000,
    height = 650
  ): VisualGraphLayout {
    // Group nodes by tier
    const tiers: Map<number, GraphNode[]> = new Map();
    for (let t = 0; t <= 5; t++) {
      tiers.set(t, []);
    }

    for (const node of graph.nodes) {
      const tierIndex = TIER_ORDER[node.type] ?? 2;
      tiers.get(tierIndex)?.push(node);
    }

    const paddingX = 80;
    const paddingY = 60;
    const availableWidth = width - 2 * paddingX;
    const availableHeight = height - 2 * paddingY;

    const visualNodes: VisualGraphNode[] = [];

    const totalTiers = 6;
    const colSpacing = availableWidth / (totalTiers - 1);

    for (let t = 0; t < totalTiers; t++) {
      const tierNodes = tiers.get(t) || [];
      if (tierNodes.length === 0) continue;

      const x = paddingX + t * colSpacing;
      const count = tierNodes.length;
      const rowSpacing = availableHeight / (count + 1);

      tierNodes.forEach((node, index) => {
        const y = paddingY + (index + 1) * rowSpacing;
        visualNodes.push({
          ...node,
          x: Math.round(x),
          y: Math.round(y),
          color: NODE_COLORS[node.type] || "#94a3b8",
        });
      });
    }

    return {
      width,
      height,
      nodes: visualNodes,
      edges: graph.edges,
    };
  }
}
