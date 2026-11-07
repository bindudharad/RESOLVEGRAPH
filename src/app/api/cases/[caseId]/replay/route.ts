import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { getCaseByIdAuthorized } from "@/server/dal/get-case-by-id";
import { TemporalEngine } from "@/server/temporal/temporal-engine";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const caseRecord = await getCaseByIdAuthorized(user, caseId);
    if (!caseRecord) {
      return NextResponse.json({ error: `Case '${caseId}' not found` }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const asOfStr = searchParams.get("asOf") || new Date().toISOString();
    const realDbCaseId = (caseRecord as { dbId?: string }).dbId || caseRecord.id;

    const replayState = await TemporalEngine.replayCaseState(realDbCaseId, asOfStr);

    return NextResponse.json({ replay: replayState });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/cases/[caseId]/replay GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
