import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PackagePassportService } from "@/server/services/package-passport.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const { sealNumber, sealType, photoStorageKey } = body;

    if (!sealNumber || !sealType) {
      return NextResponse.json(
        { error: "Missing required fields: 'sealNumber' and 'sealType' (e.g. 'TAMPER_EVIDENT_TAPE', 'HOLOGRAPHIC_LABEL')." },
        { status: 400 }
      );
    }

    const result = await PackagePassportService.attachSeal({
      packageId: id,
      sealNumber,
      sealType,
      photoStorageKey,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      package: result.package,
      seal: result.seal,
      message: `Tamper-evident seal ${sealNumber} attached and integrity hash updated.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/packages/[id]/seal POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
