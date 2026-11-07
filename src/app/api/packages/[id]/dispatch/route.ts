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

    const { carrierName, trackingNumber } = body;

    if (!carrierName || !trackingNumber) {
      return NextResponse.json(
        { error: "Missing required fields: 'carrierName' and 'trackingNumber'." },
        { status: 400 }
      );
    }

    const updated = await PackagePassportService.dispatchPackage({
      packageId: id,
      carrierName,
      trackingNumber,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      package: updated,
      message: `Package ${updated.packageNumber} marked DISPATCHED with carrier ${carrierName}.`,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/packages/[id]/dispatch POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
