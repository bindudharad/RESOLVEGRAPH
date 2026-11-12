import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canViewInternalBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BegPersistenceService } from "@/server/graph/beg-persistence.service";
import { GraphVisibilityService } from "@/server/graph/graph-visibility";
import { GraphQueryService } from "@/server/graph/graph-query.service";
import { GraphProjectionService } from "@/server/graph/graph-projection";
import type {
  BegNodeType,
  BegVerificationState,
  ConfidenceBand,
  DiscrepancyState,
  EvidenceSourceOrigin,
  GraphFilterOptions,
  GraphNodeType,
} from "@/server/graph/graph.types";

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

    if (!canViewInternalBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: Internal Bilateral Evidence Graph is restricted to authorized investigation roles." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const forceRebuild = searchParams.get("rebuild") === "true";
    const format = searchParams.get("format") || "full"; // full, layout, table
    const searchQuery = searchParams.get("search") || undefined;
    const minConfidence = (searchParams.get("minConfidence") as ConfidenceBand) || undefined;
    const rawTypes = searchParams.get("nodeTypes");
    const rawBegTypes = searchParams.get("begNodeTypes");
    const rawParties = searchParams.get("parties");
    const rawOrigins = searchParams.get("sourceOrigins");
    const rawVerifStates = searchParams.get("verificationStates");
    const rawDiscrepancyStates = searchParams.get("discrepancyStates");

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    // 1. Fetch persisted BEG graph bundle (or build & persist initially)
    const bundle = await BegPersistenceService.getPersistedGraph(realDbCaseId, forceRebuild);

    // 2. Apply multi-tenant visibility filter
    const visibleGraph = GraphVisibilityService.filterForUser(bundle.graph, {
      userId: user.id,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      organizationId: user.orgMemberships[0]?.organizationId || user.organization,
    });

    // 3. Apply optional user query filters
    const filterOptions: GraphFilterOptions = {
      searchQuery,
      minConfidence,
    };

    if (rawTypes) {
      filterOptions.nodeTypes = rawTypes.split(",") as GraphNodeType[];
    }
    if (rawBegTypes) {
      filterOptions.begNodeTypes = rawBegTypes.split(",") as BegNodeType[];
    }
    if (rawParties) {
      filterOptions.parties = rawParties.split(",") as GraphFilterOptions["parties"];
    }
    if (rawOrigins) {
      filterOptions.sourceOrigins = rawOrigins.split(",") as EvidenceSourceOrigin[];
    }
    if (rawVerifStates) {
      filterOptions.verificationStates = rawVerifStates.split(",") as BegVerificationState[];
    }
    if (rawDiscrepancyStates) {
      filterOptions.discrepancyStates = rawDiscrepancyStates.split(",") as DiscrepancyState[];
    }

    const filteredGraph = GraphQueryService.filterGraph(visibleGraph, filterOptions);

    if (format === "table") {
      const tableData = GraphProjectionService.projectToTable(filteredGraph);
      return NextResponse.json({
        caseId: filteredGraph.caseId,
        metadata: filteredGraph.metadata,
        revisions: bundle.revisions,
        edgeActions: bundle.edgeActions,
        table: tableData,
      });
    }

    if (format === "layout") {
      const layoutData = GraphProjectionService.projectToVisualLayout(filteredGraph);
      return NextResponse.json({
        caseId: filteredGraph.caseId,
        metadata: filteredGraph.metadata,
        revisions: bundle.revisions,
        edgeActions: bundle.edgeActions,
        layout: layoutData,
      });
    }

    return NextResponse.json({
      graph: filteredGraph,
      revisions: bundle.revisions,
      edgeActions: bundle.edgeActions,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/graph GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
