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
  swimlane: "BUYER" | "SHARED" | "SELLER";
}

export interface VisualGraphLayout {
  width: number;
  height: number;
  nodes: VisualGraphNode[];
  edges: GraphData["edges"];
}

const NODE_COLORS: Record<GraphNodeType, string> = {
  CASE: "#8875B5",
  COMPLAINT: "#8875B5",
  BUYER: "#4C91C8",
  BUYER_CLAIM: "#4C91C8",
  BUYER_IMAGE: "#3B82F6",
  BUYER_VIDEO: "#2563EB",
  BUYER_DOCUMENT: "#0284C7",
  BUYER_COMMUNICATION: "#60A5FA",
  MERCHANT: "#388F7D",
  SELLER: "#388F7D",
  MERCHANT_ORGANIZATION: "#2E7D6B",
  SELLER_IDENTITY: "#388F7D",
  SELLER_CLAIM: "#10B981",
  SELLER_PACKING_PHOTO: "#059669",
  SELLER_PACKING_VIDEO: "#047857",
  SELLER_DECLARATION: "#C18B45",
  SELLER_INSPECTION_RECORD: "#0D9488",
  SELLER_DISPATCH_RECORD: "#14B8A6",
  SELLER_DOCUMENT: "#34D399",
  SELLER_COMMUNICATION: "#2DD4BF",
  SELLER_EVIDENCE_REQUEST: "#C18B45",
  SELLER_RESPONSE: "#388F7D",
  EVIDENCE_REQUEST: "#C18B45",
  EVIDENCE_RESPONSE: "#388F7D",
  MARKETPLACE: "#6366F1",
  LOGISTICS_PROVIDER: "#0EA5E9",
  ORDER: "#4F46E5",
  PRODUCT: "#6366F1",
  PRODUCT_SPECIFICATION: "#8875B5",
  PURCHASE_RECORD: "#0284C7",
  INVOICE: "#0284C7",
  PAYMENT_RECORD: "#059669",
  CLAIM: "#C18B45",
  EVIDENCE: "#06B6D4",
  FACT: "#6366F1",
  EXTRACTED_FACT: "#6366F1",
  FINDING: "#8875B5",
  VERIFICATION_FINDING: "#378D70",
  BERR_FINDING: "#8875B5",
  CONTRADICTION_FINDING: "#C8372D",
  MISSING_EVIDENCE: "#929A96",
  TIMELINE_EVENT: "#8B5CF6",
  INVESTIGATION_EVENT: "#8B5CF6",
  RESOLUTION_PROPOSAL: "#14B8A6",
  PURCHASE_MEMORY: "#38BDF8",
  PACKAGE_PASSPORT: "#818CF8",
  PACKAGE_SEAL: "#34D399",
  CAMERA_SESSION: "#FB923C",
  DELIVERY_EVENT: "#A78BFA",
  CANONICAL_TRANSACTION: "#059669",
  TRANSACTION_SOURCE: "#0284C7",
  RECONCILIATION_MISMATCH: "#C8372D",
  INCIDENT_FINDING: "#D97706",
  PAYMENT_PROVIDER: "#0284C7",
  BANK: "#0D9488",
  APPROVAL: "#378D70",
  PAYPAL_ORDER: "#0284C7",
  PAYPAL_CAPTURE: "#059669",
  PAYPAL_REFUND: "#6366F1",
  PAYPAL_DISPUTE: "#C18B45",
  PROVIDER_EVENT: "#64748B",
  COMMUNICATION_EVENT: "#8B5CF6",
};

const TIER_ORDER: Record<GraphNodeType, number> = {
  BUYER: 0,
  BUYER_CLAIM: 1,
  BUYER_COMMUNICATION: 1,
  BUYER_IMAGE: 1,
  BUYER_VIDEO: 1,
  BUYER_DOCUMENT: 1,
  PURCHASE_RECORD: 2,
  INVOICE: 2,
  PURCHASE_MEMORY: 2,
  CASE: 2,
  COMPLAINT: 2,
  ORDER: 2,
  PRODUCT: 2,
  PRODUCT_SPECIFICATION: 2,
  PAYMENT_RECORD: 2,
  MARKETPLACE: 2,
  LOGISTICS_PROVIDER: 2,
  CLAIM: 1,
  EVIDENCE: 1,
  FACT: 2,
  EXTRACTED_FACT: 2,
  VERIFICATION_FINDING: 3,
  CONTRADICTION_FINDING: 3,
  MISSING_EVIDENCE: 3,
  BERR_FINDING: 3,
  FINDING: 3,
  EVIDENCE_REQUEST: 3,
  SELLER_EVIDENCE_REQUEST: 3,
  EVIDENCE_RESPONSE: 4,
  SELLER_RESPONSE: 4,
  SELLER_DECLARATION: 4,
  SELLER_CLAIM: 4,
  SELLER_PACKING_PHOTO: 4,
  SELLER_PACKING_VIDEO: 4,
  SELLER_INSPECTION_RECORD: 4,
  SELLER_DISPATCH_RECORD: 4,
  SELLER_DOCUMENT: 4,
  SELLER_COMMUNICATION: 4,
  SELLER: 5,
  MERCHANT: 5,
  MERCHANT_ORGANIZATION: 5,
  SELLER_IDENTITY: 5,
  CANONICAL_TRANSACTION: 2,
  PAYMENT_PROVIDER: 2,
  BANK: 2,
  PAYPAL_ORDER: 2,
  PAYPAL_CAPTURE: 2,
  PAYPAL_DISPUTE: 2,
  TRANSACTION_SOURCE: 2,
  PACKAGE_PASSPORT: 4,
  PACKAGE_SEAL: 4,
  CAMERA_SESSION: 1,
  PAYPAL_REFUND: 3,
  PROVIDER_EVENT: 3,
  COMMUNICATION_EVENT: 3,
  RECONCILIATION_MISMATCH: 3,
  DELIVERY_EVENT: 3,
  INCIDENT_FINDING: 3,
  TIMELINE_EVENT: 3,
  INVESTIGATION_EVENT: 3,
  APPROVAL: 3,
  RESOLUTION_PROPOSAL: 3,
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
   * Deterministically calculates adaptive 2D Bilateral coordinates (Buyer Left |
   * Shared Order/Investigation Center | Seller Right) with collision-free spacing.
   */
  public static projectToVisualLayout(
    graph: GraphData,
    width = 1320,
    minHeight = 680
  ): VisualGraphLayout {
    const getSwimlane = (node: GraphNode): "BUYER" | "SHARED" | "SELLER" => {
      if (node.swimlane) return node.swimlane;
      if (node.party === "BUYER") return "BUYER";
      if (node.party === "MERCHANT" || node.party === "SELLER") return "SELLER";
      return "SHARED";
    };

    const tiers = new Map<number, GraphNode[]>();
    for (let t = 0; t <= 5; t++) tiers.set(t, []);

    for (const node of graph.nodes) {
      const lane = getSwimlane(node);
      let col = TIER_ORDER[node.begType || node.type] ?? 2;
      if (lane === "BUYER" && col > 1) col = 1;
      if (lane === "SELLER" && col < 4) col = 4;
      if (lane === "SHARED" && (col < 2 || col > 3)) col = 2;
      tiers.get(col)?.push(node);
    }

    const maxPerCol = Math.max(1, ...Array.from(tiers.values()).map((arr) => arr.length));
    const adaptiveHeight = Math.max(minHeight, maxPerCol * 98 + 150);

    const paddingX = 95;
    const paddingY = 85;
    const availableWidth = width - 2 * paddingX;
    const availableHeight = adaptiveHeight - 2 * paddingY;
    const totalCols = 6;
    const colSpacing = availableWidth / (totalCols - 1);

    const visualNodes: VisualGraphNode[] = [];
    for (let t = 0; t < totalCols; t++) {
      const colNodes = tiers.get(t) || [];
      if (colNodes.length === 0) continue;

      const x = paddingX + t * colSpacing;
      const rowSpacing = availableHeight / (colNodes.length + 1);

      colNodes.forEach((node, idx) => {
        const y = paddingY + (idx + 1) * rowSpacing;
        const lane = getSwimlane(node);
        visualNodes.push({
          ...node,
          swimlane: lane,
          x: Math.round(x),
          y: Math.round(y),
          color: NODE_COLORS[node.begType || node.type] || NODE_COLORS[node.type] || "#929A96",
        });
      });
    }

    return {
      width,
      height: adaptiveHeight,
      nodes: visualNodes,
      edges: graph.edges,
    };
  }
}
