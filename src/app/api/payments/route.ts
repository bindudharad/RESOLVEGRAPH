/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || undefined;
    const environment = searchParams.get('environment') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: any = {};
    if (status && status !== 'ALL') where.paymentStatus = status;
    if (environment && environment !== 'ALL') where.environment = environment;

    if (!user.isPlatformAdmin) {
      const userOrgIds = user.orgMemberships.map((m) => m.organizationId);
      where.commerceOrder = {
        OR: [
          { buyerId: user.id },
          { merchantOrganizationId: { in: userOrgIds } },
        ],
      };
    }

    if (search) {
      where.OR = [
        { providerOrderId: { contains: search } },
        { captureId: { contains: search } },
        { commerceOrder: { orderNumber: { contains: search } } },
      ];
    }

    const [payments, total, totalCapturedAgg, totalRefundsAgg] = await Promise.all([
      prisma.payPalPayment.findMany({
        where,
        include: {
          commerceOrder: {
            include: {
              merchantOrganization: { select: { id: true, name: true, slug: true } },
              buyer: { select: { id: true, fullName: true, email: true } },
              case: { select: { id: true, caseNumber: true, status: true, title: true } },
            },
          },
          refunds: true,
          disputes: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payPalPayment.count({ where }),
      prisma.payPalPayment.aggregate({
        where: { ...where, paymentStatus: 'COMPLETED' },
        _sum: { amountMinor: true },
      }),
      prisma.refundTransaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountMinor: true },
      }),
    ]);

    const activeDisputesCount = await prisma.payPalDispute.count({
      where: { paypalStatus: { not: 'RESOLVED' } },
    });

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        totalCapturedMinor: totalCapturedAgg._sum.amountMinor || 0,
        totalRefundedMinor: totalRefundsAgg._sum.amountMinor || 0,
        activeDisputesCount,
        totalTransactions: total,
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('API /api/payments GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list payments' },
      { status: 500 }
    );
  }
}
