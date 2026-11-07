import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PurchaseMemoryService } from "@/server/services/purchase-memory.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const { claimStatement } = body;
    if (!claimStatement) {
      return NextResponse.json({ error: "Missing required field: 'claimStatement'" }, { status: 400 });
    }

    const memory = await PurchaseMemoryService.getPurchaseMemoryById(id);
    if (!memory) {
      return NextResponse.json({ error: `PurchaseMemory '${id}' not found.` }, { status: 404 });
    }

    // Tenancy check
    if (!user.isPlatformAdmin && memory.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Access denied to purchase record." }, { status: 403 });
    }

    const comparison = await PurchaseMemoryService.compareDisputeClaim(id, claimStatement);

    return NextResponse.json({
      success: true,
      comparison,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/purchases/[id]/compare-dispute POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
