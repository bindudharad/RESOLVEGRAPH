import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { PurchaseMemoryService } from "@/server/services/purchase-memory.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const claimStatement = body.claimStatement || body.disputeClaims || body.claim;
    if (!claimStatement || typeof claimStatement !== 'string' || !claimStatement.trim()) {
      return NextResponse.json({ error: "Missing required field: 'claimStatement' or 'disputeClaims'" }, { status: 400 });
    }

    let memory = await PurchaseMemoryService.getPurchaseMemoryById(id);
    if (!memory) {
      memory = await prisma.purchaseMemory.findFirst({
        where: { OR: [{ id }, { externalOrderId: id }, { orderId: id }] },
        include: {
          specifications: true,
          promises: true,
          snapshots: true,
          packages: {
            include: {
              items: true,
              seals: true,
              events: true,
            },
          },
          disputes: true,
        },
      });
    }

    if (!memory) {
      return NextResponse.json({ error: `PurchaseMemory '${id}' not found.` }, { status: 404 });
    }

    // Tenancy check
    if (!user.isPlatformAdmin && memory.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Access denied to purchase record." }, { status: 403 });
    }

    const comparison = await PurchaseMemoryService.compareDisputeClaim(memory.id, claimStatement.trim());
    const hasDivergence = comparison.divergencesFound.length > 0;
    const baselineSummary = Object.entries(comparison.originalSpecifications)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ') || comparison.originalListingTitle;

    return NextResponse.json({
      success: true,
      comparison,
      divergenceDetected: hasDivergence,
      divergencesFound: comparison.divergencesFound,
      baselineSummary,
      explanation: hasDivergence
        ? comparison.divergencesFound.map((d) => d.explanation).join(' ')
        : 'Dispute claim matches immutable pre-dispatch purchase baseline specifications.',
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
