import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { BuyerTrackingService } from "@/server/services/buyer-tracking.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ caseId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { caseId } = await context.params;

    const detail = await BuyerTrackingService.getBuyerComplaintDetail(user, caseId);
    if (!detail) {
      return NextResponse.json(
        { error: `Complaint '${caseId}' not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(detail);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/complaints/[caseId] GET error:", error);
    const message = error instanceof Error ? error.message : "Failed to load complaint details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
