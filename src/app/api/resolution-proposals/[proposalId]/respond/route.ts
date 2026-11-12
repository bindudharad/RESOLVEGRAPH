import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { ResolutionOrchestrationService } from "@/server/orchestration/resolution-orchestration.service";

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
    const authorizedCase = await getCaseByIdAuthorized(user, proposal.caseId);
    if (!authorizedCase) {
      return NextResponse.json({ error: `Case for proposal '${proposalId}' not found` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { response, comment } = body;

    if (!response || !["ACCEPTED", "REJECTED", "REQUESTED_CHANGES"].includes(response)) {
      return NextResponse.json(
        { error: "Valid 'response' ('ACCEPTED', 'REJECTED', 'REQUESTED_CHANGES') is required." },
        { status: 400 }
      );
    }

    const result = await ResolutionOrchestrationService.recordPartyResponse(
      {
        proposalId,
        responderId: user.id,
        response,
        comment: typeof comment === "string" ? comment : undefined,
      },
      user
    );

    return NextResponse.json({
      success: true,
      proposal: result.response,
      proposalStatus: result.proposalStatus,
      authorizationStatus: result.authorizationStatus,
      execution: result.execution,
      message: `Response '${response}' recorded successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.startsWith("Unauthorized") || message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("terminal state") || message.includes("Execution blocked")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("API /api/resolution-proposals/[proposalId]/respond POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
