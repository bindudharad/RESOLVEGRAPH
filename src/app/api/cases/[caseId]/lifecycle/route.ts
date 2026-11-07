import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { LifecycleIntelligenceService } from "@/server/ai/intelligence/lifecycle-intelligence.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    // Verify authorized access to case
    await getCaseByIdAuthorized(user, caseId);

    const report = await LifecycleIntelligenceService.analyzeCaseLifecycle(caseId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/lifecycle GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
