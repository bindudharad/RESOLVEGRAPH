/**
 * RESOLVEGRAPH — Step 5: Graph Query Service
 * High-performance graph traversal, neighborhood expansion, and subgraph filtering.
 */

import {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphFilterOptions,
  NodeNeighborhood,
} from "./graph.types";

export class GraphQueryService {
  /**
   * Filters a graph according to filter criteria (node types, party, search query, confidence).
   */
  public static filterGraph(graph: GraphData, options: GraphFilterOptions): GraphData {
    let filteredNodes = [...graph.nodes];

    // 1. Filter by node types
    if (options.nodeTypes && options.nodeTypes.length > 0) {
      const typeSet = new Set(options.nodeTypes);
      filteredNodes = filteredNodes.filter((n) => typeSet.has(n.type));
    }

    // 2. Filter by party
    if (options.parties && options.parties.length > 0) {
      const partySet = new Set(options.parties);
      filteredNodes = filteredNodes.filter((n) => n.party && partySet.has(n.party));
    }

    // 3. Filter by review status
    if (options.reviewStatuses && options.reviewStatuses.length > 0) {
      const statusSet = new Set(options.reviewStatuses);
      filteredNodes = filteredNodes.filter((n) => n.reviewStatus && statusSet.has(n.reviewStatus));
    }

    // 4. Filter by minimum confidence
    if (options.minConfidence) {
      const confidenceRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const minRank = confidenceRank[options.minConfidence] || 1;
      filteredNodes = filteredNodes.filter((n) => {
        if (!n.confidenceBand) return true;
        return (confidenceRank[n.confidenceBand] || 1) >= minRank;
      });
    }

    // 5. Filter by search query (label, sublabel, metadata values)
    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.toLowerCase().trim();
      filteredNodes = filteredNodes.filter((n) => {
        if (n.label.toLowerCase().includes(q)) return true;
        if (n.sublabel && n.sublabel.toLowerCase().includes(q)) return true;
        const metaStr = JSON.stringify(n.metadata).toLowerCase();
        return metaStr.includes(q);
      });
    }

    // Induced subgraph edges: only keep edges where both endpoints are in filteredNodes
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    let filteredEdges = graph.edges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    if (options.edgeTypes && options.edgeTypes.length > 0) {
      const edgeTypeSet = new Set(options.edgeTypes);
      filteredEdges = filteredEdges.filter((e) => edgeTypeSet.has(e.type));
    }

    return {
      caseId: graph.caseId,
      nodes: filteredNodes,
      edges: filteredEdges,
      metadata: {
        ...graph.metadata,
        nodeCount: filteredNodes.length,
        edgeCount: filteredEdges.length,
      },
    };
  }

  /**
   * Retrieves the neighborhood (1-hop or 2-hop) of a specific node.
   */
  public static getNeighborhood(graph: GraphData, nodeId: string, depth = 1): NodeNeighborhood | null {
    const rootNode = graph.nodes.find((n) => n.id === nodeId);
    if (!rootNode) return null;

    const visitedNodeIds = new Set<string>([nodeId]);
    let currentFrontier = new Set<string>([nodeId]);

    const collectedEdgeIds = new Set<string>();

    for (let d = 0; d < depth; d++) {
      const nextFrontier = new Set<string>();

      for (const edge of graph.edges) {
        if (currentFrontier.has(edge.source)) {
          collectedEdgeIds.add(edge.id);
          if (!visitedNodeIds.has(edge.target)) {
            visitedNodeIds.add(edge.target);
            nextFrontier.add(edge.target);
          }
        }
        if (currentFrontier.has(edge.target)) {
          collectedEdgeIds.add(edge.id);
          if (!visitedNodeIds.has(edge.source)) {
            visitedNodeIds.add(edge.source);
            nextFrontier.add(edge.source);
          }
        }
      }

      currentFrontier = nextFrontier;
    }

    const directNeighbors = graph.nodes.filter(
      (n) => visitedNodeIds.has(n.id) && n.id !== nodeId
    );

    const relevantEdges = graph.edges.filter((e) => collectedEdgeIds.has(e.id));
    const incomingEdges = relevantEdges.filter((e) => e.target === nodeId);
    const outgoingEdges = relevantEdges.filter((e) => e.source === nodeId);

    const connectedFindings = directNeighbors.filter((n) => n.type === "FINDING");

    return {
      rootNode,
      directNeighbors,
      incomingEdges,
      outgoingEdges,
      connectedFindings,
    };
  }

  /**
   * Finds the shortest directed or undirected explanatory path between two nodes using BFS.
   */
  public static findPath(
    graph: GraphData,
    startNodeId: string,
    endNodeId: string
  ): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
    if (startNodeId === endNodeId) {
      const node = graph.nodes.find((n) => n.id === startNodeId);
      return node ? { nodes: [node], edges: [] } : null;
    }

    // Build adjacency list
    const adj = new Map<string, Array<{ neighborId: string; edge: GraphEdge }>>();
    for (const node of graph.nodes) {
      adj.set(node.id, []);
    }

    for (const edge of graph.edges) {
      adj.get(edge.source)?.push({ neighborId: edge.target, edge });
      adj.get(edge.target)?.push({ neighborId: edge.source, edge }); // undirected path for explanation
    }

    const queue: string[] = [startNodeId];
    const prevNode = new Map<string, string>();
    const prevEdge = new Map<string, GraphEdge>();
    const visited = new Set<string>([startNodeId]);

    let found = false;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === endNodeId) {
        found = true;
        break;
      }

      const neighbors = adj.get(curr) || [];
      for (const { neighborId, edge } of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          prevNode.set(neighborId, curr);
          prevEdge.set(neighborId, edge);
          queue.push(neighborId);
        }
      }
    }

    if (!found) return null;

    // Backtrack path
    const pathNodes: GraphNode[] = [];
    const pathEdges: GraphEdge[] = [];
    let curr: string | undefined = endNodeId;

    while (curr) {
      const node = graph.nodes.find((n) => n.id === curr);
      if (node) pathNodes.unshift(node);

      const edge = prevEdge.get(curr);
      if (edge) pathEdges.unshift(edge);

      curr = prevNode.get(curr);
    }

    return { nodes: pathNodes, edges: pathEdges };
  }
}
