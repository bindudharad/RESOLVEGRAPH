import { NextRequest, NextResponse } from 'next/server';
import { requireEnterpriseAuth } from '@/server/auth/enterprise-api-auth';
import { PackagePassportService } from '@/server/services/package-passport.service';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireEnterpriseAuth(request);
    const body = await request.json().catch(() => ({}));

    const { packageId, carrierName, trackingNumber } = body;

    if (!packageId) {
      return NextResponse.json({ error: 'packageId is required.' }, { status: 400 });
    }

    const pkg = await PackagePassportService.dispatchPackage({
      packageId,
      carrierName: carrierName || 'FedEx Express',
      trackingNumber: trackingNumber || `TRK-ENT-${Date.now()}`,
      userId: authContext.userId,
    });

    return NextResponse.json(
      {
        success: true,
        package: pkg,
        merchantOrganization: authContext.organizationName,
      },
      {
        headers: {
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '993',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Enterprise dispatch error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
