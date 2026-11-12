import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { ResolutionOrchestrationService } from "@/server/orchestration/resolution-orchestration.service";
import { RefundService } from "@/server/paypal/services/refund.service";
import { UserRole } from "@/generated/prisma/client";

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

    const authorizedCase = await getCaseByIdAuthorized(user, proposal.caseId);
    if (!authorizedCase) {
      return NextResponse.json({ error: `Case for proposal '${proposalId}' not found` }, { status: 404 });
    }

    const isAuthorizedExecutor =
      user.isPlatformAdmin ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.RESOLUTION_MANAGER ||
      RefundService.isAuthorizedRefundApprover(user, proposal.organizationId);

    if (!isAuthorizedExecutor) {
      return NextResponse.json(
        { error: "Forbidden: Only authorized Resolution Managers, Admins, or Merchant Financial Owners can execute remedies." },
        { status: 403 }
      );
    }

    const execution = await ResolutionOrchestrationService.executeAuthorizedProposal(
      proposalId,
      user
    );

    const updatedProposal = await prisma.resolutionProposal.findUnique({
      where: { id: proposalId },
      include: { refunds: true, replacementFulfillment: true },
    });

    return NextResponse.json({
      success: execution.executed || execution.status === "EXECUTING_REPLACEMENT",
      execution,
      proposal: updatedProposal,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    if (message.includes("Execution blocked") || message.includes("not authorized")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    console.error("API /api/resolution-proposals/[proposalId]/execute POST error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
