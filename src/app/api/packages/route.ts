import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PackagePassportService } from "@/server/services/package-passport.service";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // If merchant, filter by organization; if admin, list all
    const orgId = user.isPlatformAdmin ? undefined : user.organization || undefined;
    const packages = await PackagePassportService.listPackages(orgId);

    return NextResponse.json({ success: true, packages });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/packages GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json().catch(() => ({}));

    const { merchantOrganizationId, orderId, purchaseMemoryId, carrierName, trackingNumber, items } = body;

    const targetOrg = merchantOrganizationId || user.organization || "org_default";

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one package item is required to register a Package Passport." },
        { status: 400 }
      );
    }

    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: targetOrg,
      orderId,
      purchaseMemoryId,
      carrierName,
      trackingNumber,
      items,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      package: pkg,
      message: `Package Passport ${pkg.packageNumber} generated successfully with secure QR token.`,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/packages POST error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
