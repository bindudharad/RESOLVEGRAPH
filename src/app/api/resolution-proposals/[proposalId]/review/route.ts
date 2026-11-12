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

    if (user.role !== "RESOLUTION_MANAGER" && user.role !== "ADMIN" && !user.isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only Resolution Managers or Admins can review proposals." },
        { status: 403 }
      );
    }

    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return NextResponse.json({ error: `Proposal '${proposalId}' not found` }, { status: 404 });
    }

    const authorizedCase = await getCaseByIdAuthorized(user, proposal.caseId);
    if (!authorizedCase) {
      return NextResponse.json({ error: `Case for proposal '${proposalId}' not found` }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { decision, reviewNotes, executeOnApprove } = body;

    if (!decision || !["APPROVED", "REJECTED", "MODIFIED"].includes(decision)) {
      return NextResponse.json(
        { error: "Valid 'decision' ('APPROVED', 'REJECTED', 'MODIFIED') is required." },
        { status: 400 }
      );
    }

    const result = await ResolutionOrchestrationService.authorizeOrDenyProposal({
      proposalId,
      actor: user,
      decision,
      reviewNotes: typeof reviewNotes === "string" ? reviewNotes : undefined,
      executeOnApprove: Boolean(executeOnApprove),
    });

    return NextResponse.json({
      success: true,
      proposal: result.proposal,
      execution: result.execution,
      message: `Proposal review decision '${decision}' applied successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (
      message.includes("blocked") ||
      message.includes("already rejected") ||
      message.includes("Completed proposal") ||
      message.includes("not automatically eligible")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("API /api/resolution-proposals/[proposalId]/review POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
