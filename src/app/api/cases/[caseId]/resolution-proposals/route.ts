import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { prisma } from "@/lib/prisma";
import { ProposalWorkflowService } from "@/server/resolution/proposal-workflow";

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
        },
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
    } = body;

    if (!proposalType || !title || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: 'proposalType', 'title', 'reason'" },
        { status: 400 }
      );
    }

    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const proposal = await ProposalWorkflowService.createProposal({
      caseId: realDbCaseId,
      proposedById: user.id,
      proposalType,
      title,
      description: description || title,
      amountMinor: typeof amountMinor === "number" ? amountMinor : undefined,
      currency: currency || caseRecord.currency,
      reason,
      policyId,
      policyVersion,
      basedOnAnalysisRunId,
    });

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/resolution-proposals POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
