/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { OrderService } from '@/server/paypal/services/order.service';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createOrderSchema = z.object({
  merchantOrganizationId: z.string().min(1, 'Merchant organization ID is required'),
  items: z.array(
    z.object({
      productReference: z.string().min(1),
      sku: z.string().optional(),
      title: z.string().min(1),
      quantity: z.number().int().positive(),
      unitAmountMinor: z.number().int().nonnegative(),
    })
  ).min(1, 'At least one line item is required'),
  currency: z.string().default('USD'),
  caseId: z.string().optional(),
  customId: z.string().optional(),
  invoiceId: z.string().optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || undefined;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;

    if (!user.isPlatformAdmin) {
      const userOrgIds = user.orgMemberships.map((m) => m.organizationId);
      where.OR = [
        { buyerId: user.id },
        { merchantOrganizationId: { in: userOrgIds } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.commerceOrder.findMany({
        where,
        include: {
          items: true,
          payments: true,
          merchantOrganization: { select: { id: true, name: true, slug: true } },
          buyer: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.commerceOrder.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/commerce/orders GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const idempotencyKey = request.headers.get('PayPal-Request-Id') || undefined;

    const result = await OrderService.createOrder({
      ...validated,
      buyerId: user.id,
      idempotencyKey,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('API /api/commerce/orders POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create order' },
      { status: 500 }
    );
  }
}
