import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canMutateBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BegSyncService } from "@/server/graph/beg-sync.service";
import { BegPersistenceService } from "@/server/graph/beg-persistence.service";
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

    if (!canMutateBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: Only investigators, resolution managers, or admins may rebuild BEG graphs." },
        { status: 403 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    // Force persisted rebuild + BERR sync
    const syncRes = await BegSyncService.handleDomainEvent({
      caseId: realDbCaseId,
      triggerEvent: "MANUAL_REBUILD",
      actorId: user.id,
      rerunBerr: true,
    });
    const bundle = await BegPersistenceService.getPersistedGraph(realDbCaseId, false);

    await CaseService.logEvent(
      realDbCaseId,
      "GRAPH_REBUILT",
      user.id,
      `Bilateral Evidence Graph rebuilt manually by ${user.fullName || user.email}`,
      {
        begGraphId: syncRes.begGraphId,
        version: syncRes.version,
        nodeCount: bundle.graph.metadata.nodeCount,
        edgeCount: bundle.graph.metadata.edgeCount,
      }
    );

    return NextResponse.json({
      success: true,
      snapshotId: bundle.revisionId,
      begGraphId: syncRes.begGraphId,
      version: syncRes.version,
      metadata: bundle.graph.metadata,
      message: "Persisted Bilateral Evidence Graph rebuilt cleanly",
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
