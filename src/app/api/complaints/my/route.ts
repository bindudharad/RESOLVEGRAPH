import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { BuyerTrackingService } from "@/server/services/buyer-tracking.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 12;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const dateFilter = searchParams.get("date") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await BuyerTrackingService.listBuyerComplaints(user, {
      page,
      limit,
      search,
      status,
      dateFilter,
      startDate,
      endDate,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/complaints/my GET error:", error);
    const message = error instanceof Error ? error.message : "Failed to load complaints";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
