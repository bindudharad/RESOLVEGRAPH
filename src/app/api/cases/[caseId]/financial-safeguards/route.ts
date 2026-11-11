import { NextRequest, NextResponse } from "next/server";
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

    const { proposalId } = body;
    if (!proposalId) {
      return NextResponse.json({ error: "Missing required field: 'proposalId'." }, { status: 400 });
    }

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Dispute case "${caseId}" not found.` }, { status: 404 });
    }

    const canonicalId = caseRecord.dbId || caseRecord.id;
    const safeguards = await SharedResolutionService.validateFinancialSafeguards(canonicalId, proposalId, user);

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
