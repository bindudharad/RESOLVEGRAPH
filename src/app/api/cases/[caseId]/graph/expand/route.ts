import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canViewInternalBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BegPersistenceService } from "@/server/graph/beg-persistence.service";
import { GraphVisibilityService } from "@/server/graph/graph-visibility";
import { GraphQueryService } from "@/server/graph/graph-query.service";

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
        { error: "Access denied: Internal BEG neighborhood expansion requires authorized investigation role." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const depthStr = searchParams.get("depth");
    const depth = depthStr ? parseInt(depthStr, 10) : 1;

    if (!nodeId) {
      return NextResponse.json({ error: "Missing required query parameter: 'nodeId'" }, { status: 400 });
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;
    const bundle = await BegPersistenceService.getPersistedGraph(realDbCaseId, false);

    const visibleGraph = GraphVisibilityService.filterForUser(bundle.graph, {
      userId: user.id,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      organizationId: user.orgMemberships[0]?.organizationId || user.organization,
    });

    const neighborhood = GraphQueryService.getNeighborhood(visibleGraph, nodeId, depth);
    if (!neighborhood) {
      return NextResponse.json({ error: `Node '${nodeId}' not found in case graph` }, { status: 404 });
    }

    return NextResponse.json({ neighborhood });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/graph/expand GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
