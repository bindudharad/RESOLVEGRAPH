import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { ProposalWorkflowService } from "@/server/resolution/proposal-workflow";
import { prisma } from "@/lib/prisma";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { proposalId } = await context.params;

    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return NextResponse.json({ error: `Proposal '${proposalId}' not found` }, { status: 404 });
    }

    // Verify user can access the dispute case
    await getCaseByIdAuthorized(user, proposal.caseId);

    const body = await request.json().catch(() => ({}));
    const { response, comment } = body;

    if (!response || !["ACCEPTED", "REJECTED", "REQUESTED_CHANGES"].includes(response)) {
      return NextResponse.json(
        { error: "Valid 'response' ('ACCEPTED', 'REJECTED', 'REQUESTED_CHANGES') is required." },
        { status: 400 }
      );
    }

    const updatedProposal = await ProposalWorkflowService.submitPartyResponse({
      proposalId,
      responderId: user.id,
      response,
      comment,
    });

    return NextResponse.json({
      success: true,
      proposal: updatedProposal,
      message: `Response '${response}' recorded successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/resolution-proposals/[proposalId]/respond POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
