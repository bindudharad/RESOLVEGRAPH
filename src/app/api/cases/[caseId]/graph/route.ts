import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { GraphBuilder } from "@/server/graph/graph-builder";
import { GraphVisibilityService } from "@/server/graph/graph-visibility";
import { GraphQueryService } from "@/server/graph/graph-query.service";
import { GraphProjectionService } from "@/server/graph/graph-projection";
import { GraphNodeType, ConfidenceBand } from "@/server/graph/graph.types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const forceRebuild = searchParams.get("rebuild") === "true";
    const format = searchParams.get("format") || "full"; // full, layout, table
    const searchQuery = searchParams.get("search") || undefined;
    const minConfidence = (searchParams.get("minConfidence") as ConfidenceBand) || undefined;
    const rawTypes = searchParams.get("nodeTypes");
    const rawParties = searchParams.get("parties");

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    // 1. Fetch or build full graph
    const rawGraph = await GraphBuilder.getOrBuild(realDbCaseId, forceRebuild);

    // 2. Apply multi-tenant visibility filter
    const visibleGraph = GraphVisibilityService.filterForUser(rawGraph, {
      userId: user.id,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      organizationId: user.orgMemberships[0]?.organizationId || user.organization,
    });

    // 3. Apply optional user query filters
    const filterOptions: Parameters<typeof GraphQueryService.filterGraph>[1] = {
      searchQuery,
      minConfidence,
    };

    if (rawTypes) {
      filterOptions.nodeTypes = rawTypes.split(",") as GraphNodeType[];
    }
    if (rawParties) {
      filterOptions.parties = rawParties.split(",") as Array<"BUYER" | "MERCHANT" | "SYSTEM" | "NEUTRAL">;
    }

    const filteredGraph = GraphQueryService.filterGraph(visibleGraph, filterOptions);

    if (format === "table") {
      const tableData = GraphProjectionService.projectToTable(filteredGraph);
      return NextResponse.json({
        caseId: filteredGraph.caseId,
        metadata: filteredGraph.metadata,
        table: tableData,
      });
    }

    if (format === "layout") {
      const layoutData = GraphProjectionService.projectToVisualLayout(filteredGraph);
      return NextResponse.json({
        caseId: filteredGraph.caseId,
        metadata: filteredGraph.metadata,
        layout: layoutData,
      });
    }

    return NextResponse.json({ graph: filteredGraph });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/graph GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
