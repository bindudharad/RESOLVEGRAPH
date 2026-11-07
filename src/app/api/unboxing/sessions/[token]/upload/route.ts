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

    if (sessionData.session.buyerId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Session does not belong to user." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const streamType = (formData.get("streamType") as string) || "REAR_PACKAGE_STREAM";
    const durationSeconds = parseFloat((formData.get("durationSeconds") as string) || "15.0");
    const fps = parseFloat((formData.get("fps") as string) || "30.0");

    if (!file) {
      return NextResponse.json({ error: "Missing video file in 'file' form field." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const stream = await CameraSessionService.uploadStream({
      sessionId: sessionData.session.id,
      streamType: streamType as "REAR_PACKAGE_STREAM" | "FRONT_VERIFIER_STREAM",
      durationSeconds,
      fps,
      codec: file.type || "video/mp4",
      fileBuffer,
    });

    return NextResponse.json({
      success: true,
      stream,
      message: `Stream ${streamType} uploaded and SHA-256 computed.`,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/unboxing/sessions/[token]/upload POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
