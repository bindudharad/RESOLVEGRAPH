import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { OrderService } from '@/server/paypal/services/order.service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { orderId } = await context.params;

    const order = await OrderService.getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Access check: platform admin, buyer, or merchant org member
    if (!user.isPlatformAdmin && order.buyerId !== user.id) {
      const isMember = user.orgMemberships.some(
        (m) => m.organizationId === order.merchantOrganizationId
      );
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied to this order' }, { status: 403 });
      }
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/commerce/orders/[orderId] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve order' },
      { status: 500 }
    );
  }
}
