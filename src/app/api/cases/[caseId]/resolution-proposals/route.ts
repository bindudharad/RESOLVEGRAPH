import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { prisma } from "@/lib/prisma";
import { canMutateCase } from "@/server/auth/permissions";
import { ResolutionOrchestrationService } from "@/server/orchestration/resolution-orchestration.service";

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

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const proposals = await prisma.resolutionProposal.findMany({
      where: { caseId: realDbCaseId },
      include: {
        proposedBy: { select: { id: true, fullName: true, role: true } },
        responses: {
          include: {
            responder: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        refunds: {
          orderBy: { createdAt: "desc" },
        },
        replacementFulfillment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ proposals });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/resolution-proposals GET error:", error);
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
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;
    const dbCase = await prisma.caseRecord.findUnique({
      where: { id: realDbCaseId },
      select: {
        id: true,
        caseNumber: true,
        buyerId: true,
        merchantId: true,
        assignedManagerId: true,
        organizationId: true,
        currency: true,
      },
    });
    if (!dbCase) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    if (!canMutateCase(user, dbCase) || user.role === "BUYER") {
      return NextResponse.json(
        { error: "Forbidden: Only authorized case handlers or merchant operators can propose remedies." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      proposalType,
      title,
      description,
      amountMinor,
      currency,
      reason,
      policyId,
      policyVersion,
      basedOnAnalysisRunId,
      basedOnAssessmentId,
      executionMode,
    } = body;

    if (!proposalType || !title || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: 'proposalType', 'title', 'reason'" },
        { status: 400 }
      );
    }

    const proposal = await ResolutionOrchestrationService.proposeRemedy({
      caseId: realDbCaseId,
      proposedById: user.id,
      proposalType,
      title,
      description: description || title,
      amountMinor: typeof amountMinor === "number" ? amountMinor : undefined,
      currency: currency || dbCase.currency,
      reason,
      policyId,
      policyVersion,
      basedOnAnalysisRunId,
      basedOnAssessmentId,
      executionMode,
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("Cannot create new refund proposal")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("API /api/cases/[caseId]/resolution-proposals POST error:", error);
    return NextResponse.json(
      {
        error:
          "We couldn't create this remedy proposal because some required case information could not be validated. The issue has been recorded for technical review.",
      },
      { status: 500 }
    );
  }
}
