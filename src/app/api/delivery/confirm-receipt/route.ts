import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { DeliveryReminderService } from "@/server/services/delivery-reminder.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const { packageId } = body;
    if (!packageId) {
      return NextResponse.json({ error: "Missing required field: 'packageId'." }, { status: 400 });
    }

    const result = await DeliveryReminderService.confirmParcelReceipt(user.id, packageId);

    return NextResponse.json({
      success: true,
      result,
      message: "Parcel receipt confirmed. Unboxing verification session reminder triggered.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/delivery/confirm-receipt POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
