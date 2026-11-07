import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PurchaseMemoryService } from "@/server/services/purchase-memory.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    const memory = await PurchaseMemoryService.getPurchaseMemoryById(id);
    if (!memory) {
      return NextResponse.json({ error: `PurchaseMemory '${id}' not found.` }, { status: 404 });
    }

    // Tenancy / User check: only the buyer, assigned merchant, or admin can inspect
    if (!user.isPlatformAdmin && memory.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Access denied to purchase record." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      purchaseMemory: memory,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/purchases/[id] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
