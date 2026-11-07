import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { DeliveryReminderService } from "@/server/services/delivery-reminder.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const { packageId, purchaseMemoryId, eventType, carrier, checkpoint, isEstimated, eventTimestamp, rawSource } = body;

    if (!eventType) {
      return NextResponse.json({ error: "Missing required field: 'eventType'." }, { status: 400 });
    }

    const event = await DeliveryReminderService.recordDeliveryEvent({
      packageId,
      purchaseMemoryId,
      eventType,
      carrier,
      checkpoint,
      isEstimated: isEstimated ?? false,
      eventTimestamp: eventTimestamp ? new Date(eventTimestamp) : undefined,
      rawSource,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      deliveryEvent: event,
      message: `Delivery event ${eventType} recorded successfully.`,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/delivery/events POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
