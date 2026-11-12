/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/server/auth/require-auth';
import { FeatureFlags } from '@/lib/feature-flags';
import {
  COMPLETED_REFUND_STATUSES,
  VALID_CAPTURED_PAYMENT_STATUSES,
} from '@/server/analytics/capture-analytics.service';
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

    const strictLiveOnly = FeatureFlags.isPayPalLiveEnabled();

    const metricsScopeWhere: any = {};
    if (strictLiveOnly) {
      metricsScopeWhere.environment = 'live';
    } else if (environment && environment !== 'ALL') {
      metricsScopeWhere.environment = environment;
    }

    if (!user.isPlatformAdmin) {
      const userOrgIds = user.orgMemberships.map((m) => m.organizationId);
      metricsScopeWhere.commerceOrder = {
        OR: [
          { buyerId: user.id },
          { merchantOrganizationId: { in: userOrgIds } },
        ],
      };
    }

    const where: any = { ...metricsScopeWhere };
    if (status && status !== 'ALL') where.paymentStatus = status;

    if (search) {
      where.OR = [
        { providerOrderId: { contains: search } },
        { captureId: { contains: search } },
        { commerceOrder: { orderNumber: { contains: search } } },
      ];
    }

    const now = new Date();
    const authoritativeCapturedWhere: any = {
      ...metricsScopeWhere,
      paymentStatus: { in: VALID_CAPTURED_PAYMENT_STATUSES },
      captureId: { not: null },
      capturedAt: { not: null, lte: now },
      amountMinor: { gt: 0 },
      ...(strictLiveOnly
        ? {
            NOT: [
              { captureId: { startsWith: 'MOCK-' } },
              { providerOrderId: { startsWith: 'MOCK-' } },
            ],
          }
        : {}),
    };

    const [payments, total, capturedByCurrencyRaw, refundsByCurrencyRaw] = await Promise.all([
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
      prisma.payPalPayment.groupBy({
        by: ['currency'],
        where: authoritativeCapturedWhere,
        _sum: { amountMinor: true },
        _count: { id: true },
      }),
      prisma.refundTransaction.groupBy({
        by: ['currency'],
        where: {
          payment: authoritativeCapturedWhere,
          status: { in: COMPLETED_REFUND_STATUSES },
          amountMinor: { gt: 0 },
        },
        _sum: { amountMinor: true },
        _count: { id: true },
      }),
    ]);

    const activeDisputesCount = await prisma.payPalDispute.count({
      where: {
        ...(metricsScopeWhere.commerceOrder
          ? { payment: { commerceOrder: metricsScopeWhere.commerceOrder } }
          : {}),
        paypalStatus: { not: 'RESOLVED' },
      },
    });

    const capturedByCurrency = capturedByCurrencyRaw.map((c) => ({
      currency: c.currency,
      totalAmountMinor: c._sum.amountMinor || 0,
      count: c._count.id,
    }));

    const refundedByCurrency = refundsByCurrencyRaw.map((r) => ({
      currency: r.currency,
      totalAmountMinor: r._sum.amountMinor || 0,
      count: r._count.id,
    }));

    const totalCapturedMinor = capturedByCurrencyRaw.reduce(
      (sum, item) => sum + (item._sum.amountMinor || 0),
      0
    );
    const totalRefundedMinor = refundsByCurrencyRaw.reduce(
      (sum, item) => sum + (item._sum.amountMinor || 0),
      0
    );

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metrics: {
        totalCapturedMinor,
        totalRefundedMinor,
        capturedByCurrency,
        refundedByCurrency,
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
