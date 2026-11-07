import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { CaseService } from "@/server/services/case.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { proposalId } = await context.params;

    if (user.role !== "RESOLUTION_MANAGER" && !user.isPlatformAdmin) {
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

    await getCaseByIdAuthorized(user, proposal.caseId);

    const body = await request.json().catch(() => ({}));
    const { decision, reviewNotes } = body; // APPROVED, REJECTED, MODIFIED

    if (!decision) {
      return NextResponse.json({ error: "Missing required field: 'decision'" }, { status: 400 });
    }

    let newStatus = proposal.status;
    if (decision === "APPROVED") {
      newStatus = "AGREED";
    } else if (decision === "REJECTED") {
      newStatus = "REJECTED";
    }

    const updated = await prisma.resolutionProposal.update({
      where: { id: proposalId },
      data: {
        status: newStatus,
        reason: reviewNotes ? `${proposal.reason} [Review: ${reviewNotes}]` : proposal.reason,
      },
    });

    await CaseService.logEvent(
      proposal.caseId,
      newStatus === "AGREED" ? "RESOLUTION_AGREED" : "RESOLUTION_RESPONSE_SUBMITTED",
      user.id,
      `Proposal review completed: ${decision}`,
      {
        proposalId,
        decision,
        reviewNotes,
        status: newStatus,
      }
    );

    return NextResponse.json({
      success: true,
      proposal: updated,
      message: `Proposal review decision '${decision}' applied successfully.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/resolution-proposals/[proposalId]/review POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
