import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { BerrV2Service } from "@/server/ai/reasoning/berr-v2.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    // Verify authorized tenancy
    await getCaseByIdAuthorized(user, caseId);

    const result = await BerrV2Service.evaluateCase(caseId);

    return NextResponse.json({
      success: true,
      berrV2: result,
      message: "BERR v2 reasoning complete with 4-category fact classification.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/berr-v2 POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
