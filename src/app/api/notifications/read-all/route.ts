import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { DeliveryReminderService } from "@/server/services/delivery-reminder.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const result = await DeliveryReminderService.markAllNotificationsRead(user.id);

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: "All notifications marked as read.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/notifications/read-all POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
