import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PurchaseDetectionService } from "@/server/services/purchase-detection.service";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const { sourceType, rawText, structuredData } = body;

    if (!sourceType) {
      return NextResponse.json(
        { error: "sourceType ('EMAIL_FORWARD', 'EMAIL_OAUTH', 'CSV_IMPORT', 'MERCHANT_API', 'MANUAL') is required." },
        { status: 400 }
      );
    }

    const detected = await PurchaseDetectionService.detectPurchase({
      sourceType,
      rawText,
      structuredData,
      buyerId: user.id,
    });

    return NextResponse.json({
      success: true,
      detected,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/purchases/detect POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
