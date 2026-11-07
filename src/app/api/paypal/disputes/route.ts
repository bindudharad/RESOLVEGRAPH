import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { DisputeService } from '@/server/paypal/services/dispute.service';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const organizationId = searchParams.get('organizationId') || undefined;
    const status = searchParams.get('status') || undefined;
    const shouldSync = searchParams.get('sync') === 'true';

    // If sync requested and user belongs to org or is admin
    if (shouldSync && organizationId) {
      if (!user.isPlatformAdmin) {
        const isMember = user.orgMemberships.some((m) => m.organizationId === organizationId);
        if (!isMember) {
          return NextResponse.json({ error: 'Unauthorized to sync for this organization' }, { status: 403 });
        }
      }
      await DisputeService.syncDisputesForOrg(organizationId);
    }

    const effectiveOrgId = user.isPlatformAdmin
      ? organizationId
      : organizationId || user.orgMemberships[0]?.organizationId;

    const disputes = await DisputeService.listDisputes(effectiveOrgId, status);

    return NextResponse.json({ disputes });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/paypal/disputes GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list disputes' },
      { status: 500 }
    );
  }
}
