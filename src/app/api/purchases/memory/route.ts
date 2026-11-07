import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PurchaseMemoryService } from "@/server/services/purchase-memory.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // If platform admin or merchant manager, return purchases based on role
    if (user.isPlatformAdmin) {
      const purchases = await prisma.purchaseMemory.findMany({
        include: { specifications: true, promises: true, packages: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ success: true, purchases });
    }

    const purchases = await PurchaseMemoryService.listBuyerPurchases(user.id);
    return NextResponse.json({ success: true, purchases });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/purchases/memory GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const { detectedData, orderId, merchantOrganizationId } = body;

    if (!detectedData || !detectedData.listingTitle || !detectedData.externalOrderId) {
      return NextResponse.json(
        { error: "detectedData with listingTitle and externalOrderId is required." },
        { status: 400 }
      );
    }

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId: user.id,
      orderId,
      merchantOrganizationId,
      detectedData,
    });

    return NextResponse.json({
      success: true,
      purchaseMemory: memory,
      message: "Purchase Memory successfully registered and cryptographically hashed.",
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/purchases/memory POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
