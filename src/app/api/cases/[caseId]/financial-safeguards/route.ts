import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { SharedResolutionService } from "@/server/services/shared-resolution.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;
    const body = await request.json().catch(() => ({}));

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Dispute case "${caseId}" not found.` }, { status: 404 });
    }

    const canonicalId = caseRecord.dbId || caseRecord.id;
    let targetProposalId = body.proposalId;

    if (!targetProposalId) {
      const existingProposal = await prisma.resolutionProposal.findFirst({
        where: { caseId: canonicalId },
        orderBy: { createdAt: "desc" },
      });
      targetProposalId = existingProposal?.id;
    }

    if (!targetProposalId) {
      return NextResponse.json({
        success: true,
        safeguards: {
          isEligible: false,
          safeguardsPassed: false,
          reasons: ["No resolution proposal is currently recorded for this case."],
          caseId: canonicalId,
          proposalId: "NONE",
          refundAmountMinor: 0,
          currency: caseRecord.currency || "USD",
          remainingBalanceMinor: 0,
        },
      });
    }

    const safeguards = await SharedResolutionService.validateFinancialSafeguards(canonicalId, targetProposalId, user);

    return NextResponse.json({
      success: true,
      safeguards,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/financial-safeguards POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
