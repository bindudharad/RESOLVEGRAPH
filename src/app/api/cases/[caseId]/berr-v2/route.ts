import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canViewInternalBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BerrV2Service } from "@/server/ai/reasoning/berr-v2.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Dispute case "${caseId}" not found.` }, { status: 404 });
    }

    if (!canViewInternalBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: internal BERR investigation assessment is restricted to authorized investigation roles." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const versionParam = searchParams.get("version");
    const targetVersion = versionParam ? Number(versionParam) : undefined;

    const canonicalId = caseRecord.dbId || caseRecord.id;
    const bundle = await BerrV2Service.getAssessmentHistory(
      canonicalId,
      targetVersion && Number.isFinite(targetVersion) ? targetVersion : undefined
    );

    return NextResponse.json({
      success: true,
      berrV2: bundle.latest,
      history: bundle.history,
      reviewActions: bundle.reviewActions,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/berr-v2 GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Dispute case "${caseId}" not found.` }, { status: 404 });
    }

    if (!canViewInternalBegGraph(user, caseRecord)) {
      return NextResponse.json(
        { error: "Access denied: only authorized investigation roles may run BERR evaluation." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const canonicalId = caseRecord.dbId || caseRecord.id;
    const result = await BerrV2Service.evaluateCase(canonicalId, {
      triggerReason:
        typeof body?.triggerReason === "string" && body.triggerReason.trim()
          ? body.triggerReason.trim()
          : "MANUAL_INVESTIGATOR_RUN",
      createdById: user.id,
      idempotencyKey:
        typeof body?.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    });
    const historyBundle = await BerrV2Service.getAssessmentHistory(canonicalId);

    return NextResponse.json({
      success: true,
      berrV2: result,
      history: historyBundle.history,
      reviewActions: historyBundle.reviewActions,
      message: "BERR reasoning complete with BEG graph linkage and 4-category classification.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/berr-v2 POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
