import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { prisma } from "@/lib/prisma";
import { canAccessCase } from "@/server/auth/permissions";
import {
  ReplacementExecutionError,
  ReplacementExecutionService,
} from "@/server/orchestration/replacement-execution.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fulfillmentId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { fulfillmentId } = await context.params;

    const fulfillment = await prisma.replacementFulfillment.findUnique({
      where: { id: fulfillmentId },
      include: {
        case: {
          select: {
            id: true,
            caseNumber: true,
            buyerId: true,
            merchantId: true,
            assignedManagerId: true,
            organizationId: true,
            status: true,
          },
        },
        proposal: true,
        packagePassport: {
          include: {
            seals: true,
            events: { orderBy: { createdAt: "desc" } },
            deliveryEvents: { orderBy: { eventTimestamp: "desc" } },
          },
        },
      },
    });

    if (!fulfillment) {
      return NextResponse.json(
        { error: `Replacement fulfillment '${fulfillmentId}' not found` },
        { status: 404 }
      );
    }

    if (!canAccessCase(user, fulfillment.case)) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this replacement fulfillment." },
        { status: 403 }
      );
    }

    return NextResponse.json({ fulfillment });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ fulfillmentId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { fulfillmentId } = await context.params;

    const body = await request.json().catch(() => ({}));
    const {
      action,
      confirmedSku,
      notes,
      carrierName,
      trackingNumber,
      sealNumber,
      sealType,
      deliveryNote,
    } = body;

    if (!action || !["SELLER_CONFIRM", "DISPATCH", "CONFIRM_DELIVERY"].includes(action)) {
      return NextResponse.json(
        { error: "Valid 'action' ('SELLER_CONFIRM', 'DISPATCH', 'CONFIRM_DELIVERY') is required." },
        { status: 400 }
      );
    }

    if (action === "SELLER_CONFIRM") {
      const updated = await ReplacementExecutionService.confirmBySeller({
        fulfillmentId,
        actor: user,
        confirmedSku: typeof confirmedSku === "string" ? confirmedSku : undefined,
        notes: typeof notes === "string" ? notes : undefined,
      });
      return NextResponse.json({ success: true, fulfillment: updated });
    }

    if (action === "DISPATCH") {
      if (!carrierName || !trackingNumber) {
        return NextResponse.json(
          { error: "Missing required fields for DISPATCH: 'carrierName', 'trackingNumber'" },
          { status: 400 }
        );
      }
      const res = await ReplacementExecutionService.dispatchReplacement({
        fulfillmentId,
        actor: user,
        carrierName: String(carrierName),
        trackingNumber: String(trackingNumber),
        confirmedSku: typeof confirmedSku === "string" ? confirmedSku : undefined,
        sealNumber: typeof sealNumber === "string" ? sealNumber : undefined,
        sealType: typeof sealType === "string" ? sealType : undefined,
      });
      return NextResponse.json({
        success: true,
        fulfillment: res.fulfillment,
        packagePassport: res.packagePassport,
        alreadyDispatched: res.alreadyDispatched,
      });
    }

    const res = await ReplacementExecutionService.confirmDeliveryAndComplete({
      fulfillmentId,
      actor: user,
      deliveryNote: typeof deliveryNote === "string" ? deliveryNote : undefined,
    });
    return NextResponse.json({
      success: true,
      fulfillment: res.fulfillment,
      alreadyCompleted: res.alreadyCompleted,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof ReplacementExecutionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
