import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/server/auth/require-auth";
import { PackagePassportService } from "@/server/services/package-passport.service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await context.params;

    const pkg = await PackagePassportService.getPackageById(id);
    if (!pkg) {
      return NextResponse.json({ error: `Package '${id}' not found.` }, { status: 404 });
    }

    // Tenancy check: Merchant can view packages in their organization, Admins can view all,
    // Buyers can view packages linked to their purchases.
    const isOwnerOrg = user.organization && user.organization === pkg.merchantOrganizationId;
    const isBuyer = pkg.purchaseMemory && pkg.purchaseMemory.buyerId === user.id;

    if (!user.isPlatformAdmin && !isOwnerOrg && !isBuyer) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to package passport." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      package: pkg,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("API /api/packages/[id] GET error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
