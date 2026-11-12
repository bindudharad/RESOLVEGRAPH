import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { canMutateBegGraph } from "@/server/auth/permissions";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { prisma } from "@/lib/prisma";
import { BegSyncService } from "@/server/graph/beg-sync.service";

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
        { error: "Access denied: Only investigators, resolution managers, or admins may review BEG relationships." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { relationId, targetType, reviewStatus, comment } = body;

    if (!relationId || !reviewStatus) {
      return NextResponse.json(
        { error: "Missing required fields: 'relationId' and 'reviewStatus'" },
        { status: 400 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    if (targetType === "CLAIM_ASSESSMENT") {
      const assessment = await prisma.factClaimAssessment.update({
        where: { id: relationId },
        data: {
          reviewStatus,
        },
      });
      await BegSyncService.handleDomainEvent({
        caseId: realDbCaseId,
        triggerEvent: "INVESTIGATION_UPDATED",
        actorId: user.id,
        rerunBerr: false,
      }).catch(() => {});
      return NextResponse.json({ success: true, assessment });
    }

    const relation = await prisma.factRelation.update({
      where: { id: relationId },
      data: {
        reviewStatus,
        reviewedById: user.id,
        reviewedAt: new Date(),
        explanation: comment ? `${comment} (reviewed)` : undefined,
      },
    });

    await BegSyncService.handleDomainEvent({
      caseId: realDbCaseId,
      triggerEvent: "INVESTIGATION_UPDATED",
      actorId: user.id,
      rerunBerr: false,
    }).catch(() => {});

    return NextResponse.json({ success: true, relation });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/relationships/review POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
