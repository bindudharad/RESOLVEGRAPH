import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { RefundService } from '@/server/paypal/services/refund.service';
import { z } from 'zod';

const refundSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  reason: z.string().min(3, 'A clear reason for the refund is required'),
  resolutionProposalId: z.string().optional(),
  noteToPayer: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { paymentId } = await context.params;
    const body = await request.json();
    const validated = refundSchema.parse(body);

    const idempotencyKey =
      request.headers.get('PayPal-Request-Id') ||
      request.headers.get('x-idempotency-key') ||
      undefined;

    const result = await RefundService.executeRefund(
      {
        paymentId,
        amountMinor: validated.amountMinor,
        reason: validated.reason,
        resolutionProposalId: validated.resolutionProposalId,
        noteToPayer: validated.noteToPayer,
        idempotencyKey,
      },
      user
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('API /api/payments/[paymentId]/refund POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute refund' },
      { status: 400 }
    );
  }
}
