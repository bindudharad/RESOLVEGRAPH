import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canMutateBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BegPersistenceService } from "@/server/graph/beg-persistence.service";

const actionSchema = z.object({
  action: z.enum([
    "CONFIRM",
    "REJECT",
    "MARK_CONTESTED",
    "REQUEST_ADDITIONAL_INFO",
    "ESCALATE",
  ]),
  explanation: z.string().trim().min(3, "Explanation of at least 3 characters is required."),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string; edgeId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId, edgeId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (!canMutateBegGraph(user, caseRecord)) {
      return NextResponse.json(
        {
          error:
            "Access denied: Only authorized investigators, resolution managers, or admins can review BEG relationships.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid review action payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;
    const decodedEdgeId = decodeURIComponent(edgeId);

    const updated = await BegPersistenceService.applyInvestigatorEdgeAction({
      caseId: realDbCaseId,
      edgeIdOrKey: decodedEdgeId,
      actorId: user.id,
      action: parsed.data.action,
      explanation: parsed.data.explanation,
    });

    const bundle = await BegPersistenceService.getPersistedGraph(realDbCaseId, false);

    return NextResponse.json({
      success: true,
      edge: updated.savedEdge,
      actionLog: updated.actionLog,
      graph: bundle.graph,
      edgeActions: bundle.edgeActions,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Failed to apply BEG edge review action";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
