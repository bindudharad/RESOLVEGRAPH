import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { DisputeService } from '@/server/paypal/services/dispute.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { disputeId } = await context.params;

    const dispute = await DisputeService.getDisputeDetails(disputeId);
    if (!dispute) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Access check: platform admin or member of the dispute's organization
    if (!user.isPlatformAdmin) {
      const isMember = user.orgMemberships.some(
        (m) => m.organizationId === dispute.organizationId
      );
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied to this dispute' }, { status: 403 });
      }
    }

    return NextResponse.json({ dispute });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/paypal/disputes/[disputeId] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve dispute' },
      { status: 500 }
    );
  }
}
