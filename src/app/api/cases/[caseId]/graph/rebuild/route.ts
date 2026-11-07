import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { GraphBuilder } from "@/server/graph/graph-builder";
import { CaseService } from "@/server/services/case.service";

export async function POST(
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

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    // Force rebuild
    const graph = await GraphBuilder.buildGraph(realDbCaseId);
    const snapshotId = await GraphBuilder.saveSnapshot(graph, "manual-rebuild");

    await CaseService.logEvent(
      realDbCaseId,
      "GRAPH_REBUILT",
      user.id,
      `Bilateral Evidence Graph rebuilt manually by ${user.fullName || user.email}`,
      {
        snapshotId,
        nodeCount: graph.metadata.nodeCount,
        edgeCount: graph.metadata.edgeCount,
      }
    );

    return NextResponse.json({
      success: true,
      snapshotId,
      metadata: graph.metadata,
      message: "Evidence graph rebuilt and snapshot persisted successfully",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/graph/rebuild POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
