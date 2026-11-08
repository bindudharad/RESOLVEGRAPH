/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { HashChainedAuditService } from '@/server/services/hash-chained-audit.service';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const shouldVerify = searchParams.get('verify') === 'true';
    const resourceType = searchParams.get('resourceType') || undefined;
    const resourceId = searchParams.get('resourceId') || undefined;

    if (shouldVerify) {
      const verification = await HashChainedAuditService.verifyChainIntegrity();
      return NextResponse.json({ success: true, verification });
    }

    if (resourceType) {
      const records = await HashChainedAuditService.getAuditTrail(resourceType, resourceId);
      return NextResponse.json({ success: true, count: records.length, data: records });
    }

    // Default verify & recent trail
    const [verification, recentRecords] = await Promise.all([
      HashChainedAuditService.verifyChainIntegrity(),
      HashChainedAuditService.getAuditTrail('CaseRecord', resourceId),
    ]);

    return NextResponse.json({
      success: true,
      verification,
      recentRecords,
    });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || 'Audit lookup failed' }, { status: 500 });
  }
}
