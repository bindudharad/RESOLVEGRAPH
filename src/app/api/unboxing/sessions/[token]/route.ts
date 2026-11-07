import { NextRequest, NextResponse } from "next/server";
import { CameraSessionService } from "@/server/services/camera-session.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    const result = await CameraSessionService.getSessionByToken(token);
    if (!result) {
      return NextResponse.json({ error: `Session '${token}' not found.` }, { status: 404 });
    }

    if (result.isExpired) {
      return NextResponse.json({ error: "Session has expired. Please initiate a new challenge." }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      session: result.session,
      activeChallenge: result.activeChallenge,
    });
  } catch (error: unknown) {
    console.error("API /api/unboxing/sessions/[token] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
