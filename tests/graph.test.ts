import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { GraphBuilder } from "../src/server/graph/graph-builder";
import { GraphValidator } from "../src/server/graph/graph-validator";
import { GraphVisibilityService } from "../src/server/graph/graph-visibility";
import { GraphQueryService } from "../src/server/graph/graph-query.service";
import { GraphProjectionService } from "../src/server/graph/graph-projection";
import { GraphData } from "../src/server/graph/graph.types";
import { prisma } from "../src/lib/prisma";

describe("ResolveGraph Evidence Graph Architecture Suite", () => {
  let testCaseId: string;

  before(async () => {
    // Find an existing demo case or create one for testing
    const c = await prisma.caseRecord.findFirst({
      where: { caseNumber: "RG-1001" },
    });
    if (c) {
      testCaseId = c.id;
    }
  });

  test("GraphBuilder constructs a valid Bilateral Evidence Graph from database", async () => {
    if (!testCaseId) return;

    const graph = await GraphBuilder.buildGraph(testCaseId);

    assert.ok(graph);
    assert.strictEqual(graph.caseId, testCaseId);
    assert.ok(graph.nodes.length >= 3, "Graph must contain Case, Buyer, and Merchant nodes");
    assert.ok(graph.edges.length >= 2, "Graph must contain edges linking parties");

    const types = new Set(graph.nodes.map((n) => n.type));
    assert.ok(types.has("CASE"));
    assert.ok(types.has("BUYER"));
    assert.ok(types.has("MERCHANT"));

    const validation = GraphValidator.validate(graph);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(validation.metrics.cycleDetected, false);
  });

  test("GraphValidator flags invalid edge types and cycles", () => {
    const invalidGraph: GraphData = {
      caseId: "case-test",
      nodes: [
        { id: "c1", type: "CASE", label: "Case 1", metadata: {} },
        { id: "f1", type: "FACT", label: "Fact 1", metadata: {} },
        { id: "f2", type: "FACT", label: "Fact 2", metadata: {} },
      ],
      edges: [
        // Self-loop
        { id: "e1", source: "f1", target: "f1", type: "RELATES_TO_FACT", label: "SUPERSEDES", provenance: "AI_INFERRED" },
        // Circular dependency f1 -> f2 -> f1
        { id: "e2", source: "f1", target: "f2", type: "RELATES_TO_FACT", label: "SUPERSEDES", provenance: "AI_INFERRED" },
        { id: "e3", source: "f2", target: "f1", type: "RELATES_TO_FACT", label: "SUPERSEDES", provenance: "AI_INFERRED" },
      ],
      metadata: {
        graphVersion: "1.0",
        generatedAt: new Date().toISOString(),
        nodeCount: 3,
        edgeCount: 3,
        tenantScope: "test",
      },
    };

    const result = GraphValidator.validate(invalidGraph);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.issues.some((i) => i.code === "SELF_LOOP_DETECTED"));
    assert.ok(result.issues.some((i) => i.code === "CIRCULAR_DEPENDENCY_DETECTED"));
  });

  test("GraphVisibilityService enforces multi-tenant boundaries and buyer redactions", () => {
    const mockGraph: GraphData = {
      caseId: "case-123",
      nodes: [
        { id: "n1", type: "CASE", label: "Case #123", metadata: {} },
        { id: "n2", type: "BUYER", label: "Buyer Alice", party: "BUYER", metadata: {} },
        {
          id: "n3",
          type: "EVIDENCE",
          label: "Merchant Internal Audit",
          party: "MERCHANT",
          metadata: { isInternal: true, merchantInternalNotes: "Confidential fraud flag" },
        },
        {
          id: "n4",
          type: "FACT",
          label: "Tracking Number",
          party: "MERCHANT",
          metadata: { isInternal: false, internalScore: 99 },
        },
      ],
      edges: [
        { id: "e1", source: "n2", target: "n1", type: "ASSERTS_CLAIM", label: "PARTY", provenance: "SYSTEM_AUDIT" },
        { id: "e2", source: "n3", target: "n1", type: "SUBMITS_EVIDENCE", label: "INTERNAL_EV", provenance: "SYSTEM_AUDIT" },
        { id: "e3", source: "n4", target: "n1", type: "EXTRACTED_FROM", label: "TRACKING", provenance: "SYSTEM_AUDIT" },
      ],
      metadata: {
        graphVersion: "1.0",
        generatedAt: new Date().toISOString(),
        nodeCount: 4,
        edgeCount: 3,
        tenantScope: "test",
      },
    };

    // Buyer visibility
    const buyerFiltered = GraphVisibilityService.filterForUser(mockGraph, {
      userId: "buyer-alice",
      role: "BUYER",
    });

    // Node n3 (isInternal: true) must be omitted
    assert.strictEqual(buyerFiltered.nodes.some((n) => n.id === "n3"), false);
    // Edge e2 must be omitted because n3 is gone
    assert.strictEqual(buyerFiltered.edges.some((e) => e.id === "e2"), false);
    // Sensitive metadata field 'internalScore' must be sanitized for n4
    const n4 = buyerFiltered.nodes.find((n) => n.id === "n4");
    assert.ok(n4);
    assert.strictEqual(n4.metadata.internalScore, undefined);

    // Platform Admin has full visibility
    const adminFiltered = GraphVisibilityService.filterForUser(mockGraph, {
      userId: "admin-priya",
      role: "RESOLUTION_MANAGER",
      isPlatformAdmin: true,
    });
    assert.strictEqual(adminFiltered.nodes.length, 4);
    assert.strictEqual(adminFiltered.edges.length, 3);
  });

  test("GraphQueryService filters subgraphs and finds explanatory paths", () => {
    const mockGraph: GraphData = {
      caseId: "case-query",
      nodes: [
        { id: "c1", type: "CASE", label: "Dispute RG-100", metadata: {} },
        { id: "cl1", type: "CLAIM", label: "Non-Delivery Claim", party: "BUYER", metadata: {} },
        { id: "ev1", type: "EVIDENCE", label: "Courier Tracking PDF", party: "MERCHANT", metadata: {} },
        { id: "f1", type: "FACT", label: "Tracking Status: Delivered", party: "MERCHANT", confidenceBand: "HIGH", metadata: {} },
      ],
      edges: [
        { id: "e1", source: "cl1", target: "c1", type: "ASSERTS_CLAIM", label: "ASSERTED", provenance: "HUMAN_ASSERTED" },
        { id: "e2", source: "f1", target: "ev1", type: "EXTRACTED_FROM", label: "EXTRACTED", provenance: "AI_INFERRED" },
        { id: "e3", source: "f1", target: "cl1", type: "ASSESSES_CLAIM", label: "CONTRADICTS", provenance: "AI_INFERRED" },
      ],
      metadata: {
        graphVersion: "1.0",
        generatedAt: new Date().toISOString(),
        nodeCount: 4,
        edgeCount: 3,
        tenantScope: "test",
      },
    };

    // Filter by node type
    const claimsOnly = GraphQueryService.filterGraph(mockGraph, { nodeTypes: ["CLAIM"] });
    assert.strictEqual(claimsOnly.nodes.length, 1);
    assert.strictEqual(claimsOnly.nodes[0].id, "cl1");

    // Neighborhood expansion
    const neighborhood = GraphQueryService.getNeighborhood(mockGraph, "f1", 1);
    assert.ok(neighborhood);
    assert.strictEqual(neighborhood.rootNode.id, "f1");
    assert.strictEqual(neighborhood.directNeighbors.length, 2); // ev1 and cl1

    // Shortest path between f1 and c1 (f1 -> cl1 -> c1)
    const path = GraphQueryService.findPath(mockGraph, "f1", "c1");
    assert.ok(path);
    assert.strictEqual(path.nodes.length, 3);
    assert.strictEqual(path.nodes[0].id, "f1");
    assert.strictEqual(path.nodes[1].id, "cl1");
    assert.strictEqual(path.nodes[2].id, "c1");
  });

  test("GraphProjectionService generates visual layout and accessible table projections", () => {
    const mockGraph: GraphData = {
      caseId: "case-proj",
      nodes: [
        { id: "c1", type: "CASE", label: "Case 1", metadata: {} },
        { id: "b1", type: "BUYER", label: "Buyer 1", metadata: {} },
        { id: "m1", type: "MERCHANT", label: "Merchant 1", metadata: {} },
      ],
      edges: [
        { id: "e1", source: "b1", target: "c1", type: "ASSERTS_CLAIM", label: "P", provenance: "SYSTEM_AUDIT" },
      ],
      metadata: {
        graphVersion: "1.0",
        generatedAt: new Date().toISOString(),
        nodeCount: 3,
        edgeCount: 1,
        tenantScope: "test",
      },
    };

    const table = GraphProjectionService.projectToTable(mockGraph);
    assert.strictEqual(table.length, 3);
    const buyerRow = table.find((r) => r.id === "b1");
    assert.ok(buyerRow);
    assert.strictEqual(buyerRow.outDegree, 1);
    assert.strictEqual(buyerRow.inDegree, 0);

    const layout = GraphProjectionService.projectToVisualLayout(mockGraph, 800, 600);
    assert.strictEqual(layout.nodes.length, 3);
    assert.ok(layout.nodes[0].x >= 0 && layout.nodes[0].x <= 800);
    assert.ok(layout.nodes[0].y >= 0 && layout.nodes[0].y <= 600);
  });
});
