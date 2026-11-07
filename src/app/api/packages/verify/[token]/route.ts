import { NextRequest, NextResponse } from "next/server";
import { PackagePassportService } from "@/server/services/package-passport.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json({ error: "Missing verification token parameter." }, { status: 400 });
    }

    const verification = await PackagePassportService.verifyQrCode(token);

    if (!verification.isValid) {
      return NextResponse.json(
        { error: verification.error || "Invalid or untrusted Package QR token." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error: unknown) {
    console.error("API /api/packages/verify/[token] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
