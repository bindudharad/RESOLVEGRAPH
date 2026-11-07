import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { proposalId } = await context.params;

    const proposal = await prisma.resolutionProposal.findUnique({
      where: { id: proposalId },
      include: {
        proposedBy: { select: { id: true, fullName: true, role: true } },
        responses: {
          include: {
            responder: { select: { id: true, fullName: true, role: true } },
          },
        },
        policy: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: `Proposal '${proposalId}' not found` }, { status: 404 });
    }

    // Check case authorization
    await getCaseByIdAuthorized(user, proposal.caseId);

    return NextResponse.json({ proposal });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/resolution-proposals/[proposalId] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
