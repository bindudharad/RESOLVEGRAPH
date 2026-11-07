import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { CameraSessionService } from "@/server/services/camera-session.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const { orderId, packageId, caseId, deviceInfo, captureMode, isFrontOptionalAccepted } = body;

    const session = await CameraSessionService.initiateSession({
      buyerId: user.id,
      orderId,
      packageId,
      caseId,
      deviceInfo,
      captureMode,
      isFrontOptionalAccepted,
    });

    return NextResponse.json({
      success: true,
      session,
      challenge: session.challenges[0],
      message: "Dual-Sight unboxing verification session initiated. Present the 6-digit challenge in frame.",
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/unboxing/sessions POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
