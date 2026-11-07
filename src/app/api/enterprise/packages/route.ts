import { NextRequest, NextResponse } from 'next/server';
import { requireEnterpriseAuth } from '@/server/auth/enterprise-api-auth';
import { PackagePassportService } from '@/server/services/package-passport.service';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireEnterpriseAuth(request);
    const body = await request.json().catch(() => ({}));

    const { carrierName, trackingNumber, items, purchaseMemoryId, orderId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Manifest items array is required.' }, { status: 400 });
    }

    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: authContext.organizationId,
      carrierName: carrierName || 'Blue Dart Express',
      trackingNumber: trackingNumber || `TRK-${Date.now()}`,
      purchaseMemoryId,
      orderId,
      userId: authContext.userId,
      items: items.map((it: Record<string, unknown>) => ({
        productName: String(it.productName || it.title || 'Product Item'),
        sku: it.sku ? String(it.sku) : undefined,
        quantity: Number(it.quantity || 1),
        serialNumber: it.serialNumber ? String(it.serialNumber) : undefined,
        declaredCapacity: it.declaredCapacity ? String(it.declaredCapacity) : undefined,
      })),
    });

    return NextResponse.json(
      {
        success: true,
        package: pkg,
      },
      {
        status: 201,
        headers: {
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '994',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Enterprise package creation error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
