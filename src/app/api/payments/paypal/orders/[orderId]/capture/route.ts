import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { CaptureService } from '@/server/paypal/services/capture.service';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { orderId } = await context.params;

    const idempotencyKey =
      request.headers.get('PayPal-Request-Id') ||
      request.headers.get('x-idempotency-key') ||
      undefined;

    const result = await CaptureService.captureOrder({
      providerOrderId: orderId,
      idempotencyKey,
      actorUserId: user.id,
    });

    return NextResponse.json({
      success: true,
      captureId: result.payment.captureId,
      status: result.payment.paymentStatus,
      isAlreadyCaptured: result.isAlreadyCaptured,
      payment: result.payment,
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/payments/paypal/orders/[orderId]/capture POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to capture PayPal order' },
      { status: 500 }
    );
  }
}
