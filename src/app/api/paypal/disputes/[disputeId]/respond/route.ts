import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { DisputeService } from '@/server/paypal/services/dispute.service';
import { z } from 'zod';

const respondSchema = z.object({
  action: z.enum(['ACCEPT_CLAIM', 'SEND_MESSAGE']),
  note: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ disputeId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { disputeId } = await context.params;
    const body = await request.json();
    const validated = respondSchema.parse(body);

    if (validated.action === 'ACCEPT_CLAIM') {
      const updated = await DisputeService.acceptClaim(disputeId, user, validated.note);
      return NextResponse.json({
        success: true,
        action: 'ACCEPT_CLAIM',
        dispute: updated,
      });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/paypal/disputes/[disputeId]/respond POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to respond to dispute' },
      { status: 500 }
    );
  }
}
