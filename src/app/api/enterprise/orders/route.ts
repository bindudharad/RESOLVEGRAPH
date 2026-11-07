import { NextRequest, NextResponse } from 'next/server';
import { requireEnterpriseAuth } from '@/server/auth/enterprise-api-auth';
import { PurchaseDetectionService } from '@/server/services/purchase-detection.service';
import { PurchaseMemoryService } from '@/server/services/purchase-memory.service';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireEnterpriseAuth(request);
    const body = await request.json().catch(() => ({}));
    const orders = Array.isArray(body.orders) ? body.orders : [body];

    if (orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided in request payload.' }, { status: 400 });
    }

    const createdMemories = [];

    for (const ord of orders) {
      const detectedData = PurchaseDetectionService.parseMerchantApiPayload({
        orderId: ord.orderNumber || ord.orderId || `ORD-ENT-${Date.now()}`,
        title: ord.title || ord.productName || 'Enterprise Order Item',
        amountMinor: ord.totalAmountMinor || 649900,
        currency: ord.currency || 'INR',
        specifications: ord.specifications || [{ key: 'storage_capacity', value: '1 TB' }],
      });

      const memory = await PurchaseMemoryService.createPurchaseMemory({
        buyerId: ord.buyerId || 'usr_alex_buyer',
        merchantOrganizationId: authContext.organizationId,
        orderId: ord.orderId,
        detectedData,
      });
      createdMemories.push(memory);
    }

    return NextResponse.json(
      {
        success: true,
        count: createdMemories.length,
        memories: createdMemories,
      },
      {
        status: 201,
        headers: {
          'x-ratelimit-limit': '1000',
          'x-ratelimit-remaining': '995',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Enterprise order import error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
