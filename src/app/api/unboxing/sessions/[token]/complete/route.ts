import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { CameraSessionService } from "@/server/services/camera-session.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { token } = await context.params;

    const sessionData = await CameraSessionService.getSessionByToken(token);
    if (!sessionData) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    const result = await CameraSessionService.completeSession(sessionData.session.id, user.id);

    return NextResponse.json({
      success: true,
      result,
      message: "Unboxing verification session marked COMPLETED and attached to case records.",
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/unboxing/sessions/[token]/complete POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
