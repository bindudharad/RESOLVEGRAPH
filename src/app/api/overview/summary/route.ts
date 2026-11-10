import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { OverviewService } from "@/server/services/overview.service";

/**
 * GET /api/overview/summary
 * Strictly authenticated endpoint returning scoped overview metrics for the session user.
 * Role, tenant boundary, and permitted data are determined exclusively on the server.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const data = await OverviewService.getScopedOverview(user);

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/overview/summary GET error:", error);
    const message = error instanceof Error ? error.message : "Failed to load overview summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
