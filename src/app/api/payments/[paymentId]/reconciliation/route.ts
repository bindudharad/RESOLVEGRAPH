import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { ReconciliationService } from '@/server/paypal/services/reconciliation.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> }
) {
  try {
    await requireAuth(request);
    const { paymentId } = await context.params;

    const result = await ReconciliationService.reconcilePayment(paymentId);
    return NextResponse.json({ reconciliation: result });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/payments/[paymentId]/reconciliation GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reconcile payment' },
      { status: 500 }
    );
  }
}
