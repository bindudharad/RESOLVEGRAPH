import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { OrderService } from '@/server/paypal/services/order.service';
import { z } from 'zod';

const createPayPalOrderSchema = z.object({
  merchantOrganizationId: z.string().min(1),
  items: z.array(
    z.object({
      productReference: z.string().min(1),
      sku: z.string().optional(),
      title: z.string().min(1),
      quantity: z.number().int().positive(),
      unitAmountMinor: z.number().int().nonnegative(),
    })
  ).min(1),
  currency: z.string().default('USD'),
  caseId: z.string().optional(),
  customId: z.string().optional(),
  invoiceId: z.string().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = createPayPalOrderSchema.parse(body);

    const idempotencyKey =
      request.headers.get('PayPal-Request-Id') ||
      request.headers.get('x-idempotency-key') ||
      undefined;

    const result = await OrderService.createOrder({
      ...validated,
      buyerId: user.id,
      idempotencyKey,
    });

    return NextResponse.json({
      orderId: result.paypalOrder.id,
      internalOrderId: result.order.id,
      orderNumber: result.order.orderNumber,
      status: result.paypalOrder.status,
      links: result.paypalOrder.links,
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('API /api/payments/paypal/orders POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
