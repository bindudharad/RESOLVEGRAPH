import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@/generated/prisma/client';
import type { AuthenticatedUser } from '@/server/auth/session';
import { CaptureAnalyticsService } from '@/server/analytics/capture-analytics.service';
import { formatMinorCurrency } from '@/server/analytics/timezone-calendar';
import { OverviewService } from '@/server/services/overview.service';
import { resetPayPalConfigForTesting } from '@/server/paypal/paypal-config';
import { GET as summaryGET } from '@/app/api/analytics/captures/summary/route';
import { GET as monthlyGET } from '@/app/api/analytics/captures/monthly/route';
import { GET as dailyGET } from '@/app/api/analytics/captures/daily/route';
import { GET as paymentsGET } from '@/app/api/payments/route';

describe('RESOLVEGRAPH: Total Capture Analytics End-to-End Suite', () => {
  const runId = `captest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const orgAId = `orgA_${runId}`;
  const orgBId = `orgB_${runId}`;

  const buyerEmail = `buyer.${runId}@test.resolvegraph.local`;
  const merchantAEmail = `merchantA.${runId}@test.resolvegraph.local`;
  const merchantBEmail = `merchantB.${runId}@test.resolvegraph.local`;
  const adminEmail = `admin.${runId}@test.resolvegraph.local`;

  let buyerId = '';
  let merchantAId = '';
  let merchantBId = '';
  let adminId = '';

  let buyerSession: AuthenticatedUser;
  let merchantASession: AuthenticatedUser;
  let merchantBSession: AuthenticatedUser;
  let adminSession: AuthenticatedUser;

  const createdOrderIds: string[] = [];
  const createdPaymentIds: string[] = [];

  // Fixed UTC timestamps carefully chosen to validate Asia/Kolkata (+05:30) and America/New_York
  // Reference date for deterministic tests: 2026-11-12 12:00:00 IST (06:30:00Z)
  const REF_NOV_12_IST = new Date('2026-11-12T06:30:00.000Z');

  async function seedPayment(params: {
    suffix: string;
    orgId: string;
    amountMinor: number;
    currency?: string;
    paymentStatus: string;
    environment?: 'sandbox' | 'live';
    captureId?: string | null;
    providerOrderId?: string;
    capturedAt?: Date | null;
  }) {
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `ORD-${runId}-${params.suffix}`,
        buyerId,
        merchantOrganizationId: params.orgId,
        totalAmountMinor: params.amountMinor,
        currency: params.currency ?? 'USD',
        status: params.paymentStatus === 'COMPLETED' ? 'CAPTURED' : 'PENDING',
      },
    });
    createdOrderIds.push(order.id);

    const payment = await prisma.payPalPayment.create({
      data: {
        commerceOrderId: order.id,
        environment: params.environment ?? 'sandbox',
        providerOrderId: params.providerOrderId ?? `PPORD-${runId}-${params.suffix}`,
        captureId: params.captureId === undefined ? `CAP-${runId}-${params.suffix}` : params.captureId,
        amountMinor: params.amountMinor,
        currency: params.currency ?? 'USD',
        paymentStatus: params.paymentStatus,
        capturedAt: params.capturedAt === undefined ? null : params.capturedAt,
      },
    });
    createdPaymentIds.push(payment.id);
    return { order, payment };
  }

  async function seedRefund(params: {
    suffix: string;
    paymentId: string;
    amountMinor: number;
    currency?: string;
    status: string;
    completedAt?: Date | null;
  }) {
    return prisma.refundTransaction.create({
      data: {
        paymentId: params.paymentId,
        refundRequestId: `RREQ-${runId}-${params.suffix}`,
        paypalRefundId:
          params.status === 'COMPLETED' || params.status === 'SUCCESS'
            ? `PPREF-${runId}-${params.suffix}`
            : null,
        amountMinor: params.amountMinor,
        currency: params.currency ?? 'USD',
        status: params.status,
        reason: `Test refund ${params.suffix}`,
        requestedById: merchantAId,
        approvedById: adminId,
        completedAt: params.completedAt ?? null,
      },
    });
  }

  before(async () => {
    const [buyer, merchantA, merchantB, admin] = await Promise.all([
      prisma.user.create({
        data: {
          email: buyerEmail,
          fullName: 'Test Capture Buyer',
          role: UserRole.BUYER,
          isPlatformAdmin: false,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: merchantAEmail,
          fullName: 'Test Merchant A',
          role: UserRole.MERCHANT,
          isPlatformAdmin: false,
          isActive: true,
          organization: 'Capture Test Store A',
        },
      }),
      prisma.user.create({
        data: {
          email: merchantBEmail,
          fullName: 'Test Merchant B',
          role: UserRole.MERCHANT,
          isPlatformAdmin: false,
          isActive: true,
          organization: 'Capture Test Store B',
        },
      }),
      prisma.user.create({
        data: {
          email: adminEmail,
          fullName: 'Test Platform Admin',
          role: UserRole.ADMIN,
          isPlatformAdmin: true,
          isActive: true,
          organization: 'ResolveGraph Platform',
        },
      }),
    ]);

    buyerId = buyer.id;
    merchantAId = merchantA.id;
    merchantBId = merchantB.id;
    adminId = admin.id;

    await Promise.all([
      prisma.organization.create({
        data: {
          id: orgAId,
          name: 'Capture Test Store A',
          slug: `capture-store-a-${runId}`,
          isActive: true,
        },
      }),
      prisma.organization.create({
        data: {
          id: orgBId,
          name: 'Capture Test Store B',
          slug: `capture-store-b-${runId}`,
          isActive: true,
        },
      }),
    ]);

    await Promise.all([
      prisma.organizationMember.create({
        data: {
          userId: merchantAId,
          organizationId: orgAId,
          role: 'OWNER',
          isActive: true,
        },
      }),
      prisma.organizationMember.create({
        data: {
          userId: merchantBId,
          organizationId: orgBId,
          role: 'OWNER',
          isActive: true,
        },
      }),
    ]);

    buyerSession = {
      id: buyerId,
      email: buyerEmail,
      name: buyer.fullName,
      fullName: buyer.fullName,
      role: UserRole.BUYER,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: null,
      orgMemberships: [],
    };

    merchantASession = {
      id: merchantAId,
      email: merchantAEmail,
      name: merchantA.fullName,
      fullName: merchantA.fullName,
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: 'Capture Test Store A',
      orgMemberships: [
        {
          organizationId: orgAId,
          role: 'OWNER',
          organization: { id: orgAId, name: 'Capture Test Store A', slug: `capture-store-a-${runId}` },
        },
      ],
    };

    merchantBSession = {
      id: merchantBId,
      email: merchantBEmail,
      name: merchantB.fullName,
      fullName: merchantB.fullName,
      role: UserRole.MERCHANT,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: 'Capture Test Store B',
      orgMemberships: [
        {
          organizationId: orgBId,
          role: 'OWNER',
          organization: { id: orgBId, name: 'Capture Test Store B', slug: `capture-store-b-${runId}` },
        },
      ],
    };

    adminSession = {
      id: adminId,
      email: adminEmail,
      name: admin.fullName,
      fullName: admin.fullName,
      role: UserRole.ADMIN,
      isPlatformAdmin: true,
      isActive: true,
      avatarUrl: null,
      organization: 'ResolveGraph Platform',
      orgMemberships: [],
    };

    // ---------------- Seed Org A USD Captures Across Months ----------------
    // Older than 6-month window (2026-05): $25.00 (excluded from 6-mo, included in lifetime)
    await seedPayment({
      suffix: 'a-may-2026',
      orgId: orgAId,
      amountMinor: 2500,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-05-15T10:00:00.000Z'),
    });

    // Historical leap Feb 2024 & non-leap Feb 2025 for calendar length tests
    await seedPayment({
      suffix: 'a-feb-2024',
      orgId: orgAId,
      amountMinor: 4000,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2024-02-29T08:00:00.000Z'),
    });
    await seedPayment({
      suffix: 'a-feb-2025',
      orgId: orgAId,
      amountMinor: 3500,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2025-02-28T08:00:00.000Z'),
    });

    // 2026-06 (Jun - start of 6-mo window): $100.00 (1 capture, CAPTURED status)
    await seedPayment({
      suffix: 'a-jun-1',
      orgId: orgAId,
      amountMinor: 10000,
      paymentStatus: 'CAPTURED',
      capturedAt: new Date('2026-06-10T09:00:00.000Z'),
    });

    // 2026-07 (Jul): NO captures -> validates empty month zero-filling

    // 2026-08 (Aug): $200.00 + $50.00 (PARTIALLY_REFUNDED with $40.00 COMPLETED refund + $30.00 PENDING ignored)
    const { payment: augP1 } = await seedPayment({
      suffix: 'a-aug-1',
      orgId: orgAId,
      amountMinor: 20000,
      paymentStatus: 'PARTIALLY_REFUNDED',
      capturedAt: new Date('2026-08-05T10:00:00.000Z'),
    });
    await seedRefund({
      suffix: 'aug-completed',
      paymentId: augP1.id,
      amountMinor: 4000,
      status: 'COMPLETED',
      completedAt: new Date('2026-08-06T10:00:00.000Z'),
    });
    await seedRefund({
      suffix: 'aug-pending',
      paymentId: augP1.id,
      amountMinor: 3000,
      status: 'PENDING',
    });
    await seedRefund({
      suffix: 'aug-failed',
      paymentId: augP1.id,
      amountMinor: 2000,
      status: 'FAILED',
    });
    await seedPayment({
      suffix: 'a-aug-2',
      orgId: orgAId,
      amountMinor: 5000,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-08-20T10:00:00.000Z'),
    });

    // 2026-09 (Sep): NO captures -> validates 30-day empty historical month

    // 2026-10 (Oct):
    //   1) $150.00 COMPLETED on Oct 15
    //   2) $80.00 REFUNDED on Oct 18 with $80.00 SUCCESS refund (keeps gross $80, net $0)
    //   3) Timezone boundary capture: 2026-10-31T19:00:00.000Z ($90.00)
    //      -> in UTC & America/New_York: 2026-10-31 (Oct)
    //      -> in Asia/Kolkata (+05:30): 2026-11-01 00:30 IST (Nov!)
    await seedPayment({
      suffix: 'a-oct-1',
      orgId: orgAId,
      amountMinor: 15000,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-10-15T10:00:00.000Z'),
    });
    const { payment: octP2 } = await seedPayment({
      suffix: 'a-oct-2',
      orgId: orgAId,
      amountMinor: 8000,
      paymentStatus: 'REFUNDED',
      capturedAt: new Date('2026-10-18T10:00:00.000Z'),
    });
    await seedRefund({
      suffix: 'oct-full-success',
      paymentId: octP2.id,
      amountMinor: 8000,
      status: 'SUCCESS',
      completedAt: new Date('2026-10-19T10:00:00.000Z'),
    });
    await seedPayment({
      suffix: 'a-tz-boundary',
      orgId: orgAId,
      amountMinor: 9000,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-10-31T19:00:00.000Z'),
    });

    // 2026-11 (Nov - current month up to Nov 12):
    //   1) Nov 05 IST ($120.00)
    //   2) Nov 12 IST ($300.00 live non-mock)
    await seedPayment({
      suffix: 'a-nov-5',
      orgId: orgAId,
      amountMinor: 12000,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-11-05T06:00:00.000Z'), // 11:30 IST Nov 05
    });
    await seedPayment({
      suffix: 'a-nov-12-live',
      orgId: orgAId,
      amountMinor: 30000,
      paymentStatus: 'COMPLETED',
      environment: 'live',
      providerOrderId: `LIVEORD-${runId}-nov12`,
      captureId: `LIVECAP-${runId}-nov12`,
      capturedAt: new Date('2026-11-12T04:00:00.000Z'), // 09:30 IST Nov 12
    });

    // Cancelled refund on Nov 12 payment should NOT reduce net
    await seedRefund({
      suffix: 'nov-cancelled',
      paymentId: createdPaymentIds[createdPaymentIds.length - 1],
      amountMinor: 5000,
      status: 'CANCELLED',
    });

    // ---------------- Invalid / Uncaptured Records That MUST Be Excluded ----------------
    for (const [idx, badStatus] of [
      'CREATED',
      'APPROVED',
      'PENDING',
      'FAILED',
      'CANCELLED',
      'VOIDED',
      'DENIED',
      'REVERSED',
    ].entries()) {
      await seedPayment({
        suffix: `bad-status-${idx}-${badStatus}`,
        orgId: orgAId,
        amountMinor: 77700,
        paymentStatus: badStatus,
        capturedAt: new Date('2026-11-10T08:00:00.000Z'),
      });
    }
    // Missing capturedAt
    await seedPayment({
      suffix: 'bad-null-capturedAt',
      orgId: orgAId,
      amountMinor: 88800,
      paymentStatus: 'COMPLETED',
      capturedAt: null,
    });
    // Missing captureId
    await seedPayment({
      suffix: 'bad-null-captureId',
      orgId: orgAId,
      amountMinor: 99900,
      paymentStatus: 'COMPLETED',
      captureId: null,
      capturedAt: new Date('2026-11-10T08:00:00.000Z'),
    });
    // Zero amount
    await seedPayment({
      suffix: 'bad-zero-amount',
      orgId: orgAId,
      amountMinor: 0,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-11-10T08:00:00.000Z'),
    });
    // Future capture timestamp (> referenceDate)
    await seedPayment({
      suffix: 'bad-future-capture',
      orgId: orgAId,
      amountMinor: 66600,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-11-14T08:00:00.000Z'),
    });

    // ---------------- Multi-Currency Capture in Org A (INR) ----------------
    await seedPayment({
      suffix: 'a-inr-nov',
      orgId: orgAId,
      amountMinor: 500000, // ₹5,000.00 INR
      currency: 'INR',
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-11-10T07:00:00.000Z'),
    });

    // ---------------- Separate Tenant Org B Capture ($999.00) ----------------
    await seedPayment({
      suffix: 'b-nov-isolated',
      orgId: orgBId,
      amountMinor: 99900,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-11-11T07:00:00.000Z'),
    });
  });

  after(async () => {
    await prisma.refundTransaction.deleteMany({
      where: { paymentId: { in: createdPaymentIds } },
    });
    await prisma.payPalPayment.deleteMany({
      where: { id: { in: createdPaymentIds } },
    });
    await prisma.commerceOrder.deleteMany({
      where: { id: { in: createdOrderIds } },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: { in: [orgAId, orgBId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgAId, orgBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [buyerId, merchantAId, merchantBId, adminId].filter(Boolean) } },
    });
  });

  it('1. 6-month rollup includes current + 5 prior months, zero-fills empty months, excludes pre-window & uncaptured records', async () => {
    const monthly = await CaptureAnalyticsService.getMonthly(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      referenceDate: REF_NOV_12_IST,
    });

    assert.equal(monthly.months.length, 6);
    assert.deepEqual(
      monthly.months.map((m) => m.monthKey),
      ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
    );
    assert.equal(monthly.months[5].isCurrentMonth, true);
    assert.equal(monthly.months[4].isCurrentMonth, false);

    // 2026-06: $100.00, 1 capture
    assert.equal(monthly.months[0].grossCapturedMinor, 10000);
    assert.equal(monthly.months[0].captureCount, 1);

    // 2026-07: zero-filled inactive month
    assert.equal(monthly.months[1].grossCapturedMinor, 0);
    assert.equal(monthly.months[1].captureCount, 0);

    // 2026-08: $200 + $50 = $250 gross, $40 completed refund, $210 net, 2 captures
    assert.equal(monthly.months[2].grossCapturedMinor, 25000);
    assert.equal(monthly.months[2].refundedMinor, 4000);
    assert.equal(monthly.months[2].netCapturedMinor, 21000);
    assert.equal(monthly.months[2].captureCount, 2);

    // 2026-09: zero-filled inactive month
    assert.equal(monthly.months[3].grossCapturedMinor, 0);
    assert.equal(monthly.months[3].captureCount, 0);

    // 2026-10 (Asia/Kolkata): $150 + $80 = $230 gross ($90 boundary shifted into Nov!), $80 refunded, $150 net, 2 captures
    assert.equal(monthly.months[4].grossCapturedMinor, 23000);
    assert.equal(monthly.months[4].refundedMinor, 8000);
    assert.equal(monthly.months[4].netCapturedMinor, 15000);
    assert.equal(monthly.months[4].captureCount, 2);

    // 2026-11 (Asia/Kolkata): $90 (boundary) + $120 + $300 = $510 gross, 3 captures, 0 completed refunds
    assert.equal(monthly.months[5].grossCapturedMinor, 51000);
    assert.equal(monthly.months[5].refundedMinor, 0);
    assert.equal(monthly.months[5].netCapturedMinor, 51000);
    assert.equal(monthly.months[5].captureCount, 3);

    // 6-mo window total excludes May ($25), Feb 2024 ($40), Feb 2025 ($35), Org B ($999), and INR captures
    assert.equal(monthly.windowTotals.grossCapturedMinor, 109000);
    assert.equal(monthly.windowTotals.captureCount, 8);
    assert.equal(monthly.windowTotals.refundedMinor, 12000);
    assert.equal(monthly.windowTotals.netCapturedMinor, 97000);
  });

  it('2. Cross-year 6-month rollup spans Dec->Jan boundary cleanly', async () => {
    const crossYearMonthly = await CaptureAnalyticsService.getMonthly(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      referenceDate: new Date('2026-02-15T10:00:00.000Z'),
    });

    assert.deepEqual(
      crossYearMonthly.months.map((m) => m.monthKey),
      ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
    );
    assert.equal(crossYearMonthly.months[5].isCurrentMonth, true);
  });

  it('3. Daily performance renders elapsed days for current month and full calendar days for 28/29/30/31-day historical months', async () => {
    // Current month Nov 2026 as of Nov 12: only 12 days rendered (never future days 13..30)
    const novDaily = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(novDaily.isCurrentMonth, true);
    assert.equal(novDaily.daysInMonth, 30);
    assert.equal(novDaily.elapsedDaysCount, 12);
    assert.equal(novDaily.days.length, 12);
    assert.equal(novDaily.days[0].grossCapturedMinor, 9000); // Nov 1 boundary in IST
    assert.equal(novDaily.days[4].grossCapturedMinor, 12000); // Nov 5
    assert.equal(novDaily.days[11].grossCapturedMinor, 30000); // Nov 12
    assert.equal(novDaily.days[11].isToday, true);
    assert.equal(novDaily.days[1].grossCapturedMinor, 0); // Zero-filled Nov 2

    // 31-day Oct 2026
    const octDaily = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      month: '2026-10',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(octDaily.isCurrentMonth, false);
    assert.equal(octDaily.daysInMonth, 31);
    assert.equal(octDaily.days.length, 31);
    assert.equal(octDaily.summary.grossCapturedMinor, 23000);
    assert.equal(octDaily.summary.refundedMinor, 8000);
    assert.equal(octDaily.summary.netCapturedMinor, 15000);

    // 30-day empty Sep 2026
    const sepDaily = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      month: '2026-09',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(sepDaily.daysInMonth, 30);
    assert.equal(sepDaily.days.length, 30);
    assert.equal(sepDaily.hasCapturesInMonth, false);
    assert.equal(sepDaily.summary.grossCapturedMinor, 0);

    // 29-day leap Feb 2024 vs 28-day non-leap Feb 2025
    const leapFeb = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'UTC',
      month: '2024-02',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(leapFeb.days.length, 29);
    assert.equal(leapFeb.days[28].grossCapturedMinor, 4000);

    const stdFeb = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'UTC',
      month: '2025-02',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(stdFeb.days.length, 28);
    assert.equal(stdFeb.days[27].grossCapturedMinor, 3500);
  });

  it('4. Timezone boundary shifts 2026-10-31T19:00:00Z cleanly between Oct (New York/UTC) and Nov (Kolkata)', async () => {
    const nyOct = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'America/New_York',
      month: '2026-10',
      referenceDate: REF_NOV_12_IST,
    });
    // In America/New_York, 2026-10-31T19:00:00Z is Oct 31 15:00 EDT -> included on Oct 31!
    assert.equal(nyOct.days[30].grossCapturedMinor, 9000);
    assert.equal(nyOct.summary.grossCapturedMinor, 32000); // $150 + $80 + $90
    assert.equal(nyOct.summary.captureCount, 3);

    const nyNov = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'America/New_York',
      month: '2026-11',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(nyNov.days[0].grossCapturedMinor, 0);
    assert.equal(nyNov.summary.grossCapturedMinor, 42000); // $120 + $300
    assert.equal(nyNov.summary.captureCount, 2);
  });

  it('5. Summary totals, MoM comparison, refund exclusion, and multi-currency separation are exact', async () => {
    const summaryUsd = await CaptureAnalyticsService.getSummary(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      referenceDate: REF_NOV_12_IST,
    });

    // Available currencies strictly separated: USD ($1,190.00, 11 captures) & INR (₹5,000.00, 1 capture)
    assert.equal(summaryUsd.availableCurrencies.length, 2);
    const usdCurrency = summaryUsd.availableCurrencies.find((c) => c.currency === 'USD')!;
    const inrCurrency = summaryUsd.availableCurrencies.find((c) => c.currency === 'INR')!;
    assert.equal(usdCurrency.grossCapturedMinor, 119000);
    assert.equal(usdCurrency.captureCount, 11);
    assert.equal(usdCurrency.refundedMinor, 12000);
    assert.equal(usdCurrency.netCapturedMinor, 107000);
    assert.equal(inrCurrency.grossCapturedMinor, 500000);
    assert.equal(inrCurrency.captureCount, 1);

    // Current month (Nov = $510.00) vs Previous month (Oct = $230.00) -> +121.74%
    assert.equal(summaryUsd.currentMonth.grossCapturedMinor, 51000);
    assert.equal(summaryUsd.previousMonth.grossCapturedMinor, 23000);
    assert.equal(summaryUsd.previousMonth.comparisonDeltaMinor, 28000);
    assert.ok(summaryUsd.previousMonth.comparisonPercent !== null);
    assert.ok(Math.abs(summaryUsd.previousMonth.comparisonPercent - 121.74) < 0.05);

    // Explicit INR filter returns only INR metrics
    const summaryInr = await CaptureAnalyticsService.getSummary(merchantASession, {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(summaryInr.selectedCurrency, 'INR');
    assert.equal(summaryInr.lifetime.grossCapturedMinor, 500000);
    assert.equal(summaryInr.lifetime.captureCount, 1);
    assert.equal(formatMinorCurrency(500000, 'INR'), '₹5,000.00');
    assert.equal(formatMinorCurrency(119000, 'USD'), '$1,190.00');
  });

  it('6. Strictly enforces Auth (401), Role RBAC (BUYER->403, inactive->403), and Cross-Org Isolation (403)', async () => {
    // Unauthenticated API calls -> 401
    for (const handler of [summaryGET, monthlyGET, dailyGET]) {
      const res = await handler(new NextRequest('http://localhost:3000/api/analytics/captures/summary'));
      assert.equal(res.status, 401);
    }

    // BUYER -> 403 (both HTTP and service-layer RBAC)
    await assert.rejects(
      () => CaptureAnalyticsService.getSummary(buyerSession),
      (err: unknown) => err instanceof Error && 'status' in err && (err as { status: number }).status === 403
    );
    const buyerSummaryRes = await summaryGET(
      new NextRequest('http://localhost:3000/api/analytics/captures/summary', {
        headers: { 'x-demo-user-email': buyerEmail },
      })
    );
    assert.equal(buyerSummaryRes.status, 403);

    // Merchant A tampering with Org B organizationId -> 403
    const crossOrgRes = await monthlyGET(
      new NextRequest(
        `http://localhost:3000/api/analytics/captures/monthly?organizationId=${encodeURIComponent(orgBId)}`,
        { headers: { 'x-demo-user-email': merchantAEmail } }
      )
    );
    assert.equal(crossOrgRes.status, 403);

    // Merchant B sees ONLY Org B ($999.00, 1 capture)
    const orgBSummary = await CaptureAnalyticsService.getSummary(merchantBSession, {
      timezone: 'Asia/Kolkata',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(orgBSummary.lifetime.grossCapturedMinor, 99900);
    assert.equal(orgBSummary.lifetime.captureCount, 1);

    // Platform Admin unscoped sees all platform captures including Org A + Org B
    const adminUnscoped = await CaptureAnalyticsService.getSummary(adminSession, {
      currency: 'USD',
      organizationId: orgAId,
      timezone: 'Asia/Kolkata',
      referenceDate: REF_NOV_12_IST,
    });
    assert.equal(adminUnscoped.lifetime.grossCapturedMinor, 119000);

    // Platform Admin filtering by Org A via HTTP equals Merchant A exact USD totals
    const adminFilteredRes = await summaryGET(
      new NextRequest(
        `http://localhost:3000/api/analytics/captures/summary?organizationId=${encodeURIComponent(orgAId)}&currency=USD`,
        { headers: { 'x-demo-user-email': adminEmail } }
      )
    );
    assert.equal(adminFilteredRes.status, 200);
    assert.match(adminFilteredRes.headers.get('cache-control') || '', /no-store/i);
    const adminBody = await adminFilteredRes.json();
    assert.equal(adminBody.lifetime.grossCapturedMinor, 119000);
    assert.equal(adminBody.lifetime.captureCount, 11);

    // Inactive merchant rejected with 403
    await assert.rejects(
      () => CaptureAnalyticsService.getSummary({ ...merchantASession, isActive: false }),
      (err: unknown) => err instanceof Error && 'status' in err && (err as { status: number }).status === 403
    );
  });

  it('7. Rejects invalid query parameters cleanly with HTTP 400', async () => {
    const badUrls = [
      'http://localhost:3000/api/analytics/captures/daily?month=2099-01', // future month
      'http://localhost:3000/api/analytics/captures/daily?month=2026-13', // invalid month number
      'http://localhost:3000/api/analytics/captures/daily?month=not-a-month',
      'http://localhost:3000/api/analytics/captures/summary?currency=US', // non-ISO 4217
      'http://localhost:3000/api/analytics/captures/summary?timezone=Invalid/Timezone_Place',
      'http://localhost:3000/api/analytics/captures/monthly?environment=staging',
    ];

    for (const url of badUrls) {
      const handler = url.includes('/daily')
        ? dailyGET
        : url.includes('/monthly')
          ? monthlyGET
          : summaryGET;
      const res = await handler(
        new NextRequest(url, { headers: { 'x-demo-user-email': merchantAEmail } })
      );
      assert.equal(res.status, 400, `Expected HTTP 400 for URL: ${url}`);
    }
  });

  it('8. OverviewService dashboard KPI synchronizes live when a new capture is persisted', async () => {
    const beforeOverview = await OverviewService.getScopedOverview(merchantASession);
    assert.ok(beforeOverview.totalCapture);
    const prevGross = beforeOverview.totalCapture.grossCapturedMinor;
    const prevCount = beforeOverview.totalCapture.captureCount;

    // Persist a brand new captured transaction in Org A (now)
    const { payment } = await seedPayment({
      suffix: 'a-live-sync-check',
      orgId: orgAId,
      amountMinor: 4250, // +$42.50
      paymentStatus: 'COMPLETED',
      capturedAt: new Date(Date.now() - 1000),
    });

    const afterOverview = await OverviewService.getScopedOverview(merchantASession);
    assert.ok(afterOverview.totalCapture);
    assert.equal(afterOverview.totalCapture.currency, 'USD');
    assert.equal(afterOverview.totalCapture.grossCapturedMinor, prevGross + 4250);
    assert.equal(afterOverview.totalCapture.captureCount, prevCount + 1);
    assert.ok(afterOverview.kpis.payments.value.includes('1,232.50'));

    // Also clean this extra payment explicitly at end (handled by after() via createdPaymentIds)
    assert.ok(payment.id);
  });

  it('9. Production live-mode flag excludes sandbox and MOCK-* captures from totals', async () => {
    const prevFlag = process.env.PAYPAL_LIVE_ENABLED;
    const prevNodeEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.PAYPAL_LIVE_ENABLED = 'true';
    resetPayPalConfigForTesting();
    try {
      const liveSummary = await CaptureAnalyticsService.getSummary(merchantASession, {
        currency: 'USD',
        timezone: 'Asia/Kolkata',
        referenceDate: REF_NOV_12_IST,
      });
      // Only a-nov-12-live ($300.00) is environment='live' without MOCK- prefix
      assert.equal(liveSummary.environmentMode, 'LIVE');
      assert.equal(liveSummary.lifetime.grossCapturedMinor, 30000);
      assert.equal(liveSummary.lifetime.captureCount, 1);
    } finally {
      if (prevNodeEnv === undefined) {
        delete (process.env as Record<string, string | undefined>).NODE_ENV;
      } else {
        (process.env as Record<string, string | undefined>).NODE_ENV = prevNodeEnv;
      }
      if (prevFlag === undefined) {
        delete process.env.PAYPAL_LIVE_ENABLED;
      } else {
        process.env.PAYPAL_LIVE_ENABLED = prevFlag;
      }
      resetPayPalConfigForTesting();
    }
  });

  it('10. Database unique constraints reject duplicate captureId and duplicate paypalRefundId', async () => {
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `ORD-${runId}-dedup`,
        buyerId,
        merchantOrganizationId: orgAId,
        totalAmountMinor: 1000,
        currency: 'USD',
        status: 'CAPTURED',
      },
    });
    createdOrderIds.push(order.id);

    await assert.rejects(() =>
      prisma.payPalPayment.create({
        data: {
          commerceOrderId: order.id,
          environment: 'sandbox',
          providerOrderId: `PPORD-${runId}-dup`,
          captureId: `CAP-${runId}-a-jun-1`, // already exists
          amountMinor: 10000,
          currency: 'USD',
          paymentStatus: 'COMPLETED',
          capturedAt: new Date(),
        },
      })
    );

    // Duplicate paypalRefundId rejected cleanly by unique index
    const firstRefundPayment = await seedPayment({
      suffix: 'a-dup-refund-base',
      orgId: orgAId,
      amountMinor: 5000,
      paymentStatus: 'PARTIALLY_REFUNDED',
      capturedAt: new Date('2026-11-04T06:00:00.000Z'),
    });
    await prisma.refundTransaction.create({
      data: {
        paymentId: firstRefundPayment.payment.id,
        refundRequestId: `RREQ-${runId}-unique-1`,
        paypalRefundId: `PPREF-${runId}-UNIQUE`,
        amountMinor: 1500,
        currency: 'USD',
        status: 'COMPLETED',
        reason: 'Initial partial refund',
        requestedById: merchantAId,
        approvedById: adminId,
        completedAt: new Date('2026-11-04T08:00:00.000Z'),
      },
    });
    await assert.rejects(() =>
      prisma.refundTransaction.create({
        data: {
          paymentId: firstRefundPayment.payment.id,
          refundRequestId: `RREQ-${runId}-unique-2`,
          paypalRefundId: `PPREF-${runId}-UNIQUE`,
          amountMinor: 1500,
          currency: 'USD',
          status: 'COMPLETED',
          reason: 'Duplicate webhook replay refund',
          requestedById: merchantAId,
          approvedById: adminId,
          completedAt: new Date('2026-11-04T08:05:00.000Z'),
        },
      })
    );
  });

  it('11. Near-midnight 23:59 vs 00:01 captures split accurately in business timezone and daily net clamps safely', async () => {
    // 2026-11-06 23:59:00 IST == 2026-11-06T18:29:00.000Z
    await seedPayment({
      suffix: 'a-nov6-2359-ist',
      orgId: orgAId,
      amountMinor: 2500,
      paymentStatus: 'COMPLETED',
      capturedAt: new Date('2026-11-06T18:29:00.000Z'),
    });
    // 2026-11-07 00:01:00 IST == 2026-11-06T18:31:00.000Z
    const { payment: nov7Payment } = await seedPayment({
      suffix: 'a-nov7-0001-ist',
      orgId: orgAId,
      amountMinor: 3500,
      paymentStatus: 'CAPTURED',
      capturedAt: new Date('2026-11-06T18:31:00.000Z'),
    });
    // Completed refund equal to full capture on Nov 7 leaves gross $35, net $0
    await seedRefund({
      suffix: 'nov7-full-success',
      paymentId: nov7Payment.id,
      amountMinor: 3500,
      status: 'SUCCESS',
      completedAt: new Date('2026-11-07T02:00:00.000Z'),
    });

    const novDaily = await CaptureAnalyticsService.getDaily(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
      month: '2026-11',
      referenceDate: REF_NOV_12_IST,
    });

    // Day index 5 => Nov 6, index 6 => Nov 7
    assert.equal(novDaily.days[5].day, 6);
    assert.equal(novDaily.days[5].grossCapturedMinor, 2500);
    assert.equal(novDaily.days[5].captureCount, 1);
    assert.equal(novDaily.days[6].day, 7);
    assert.equal(novDaily.days[6].grossCapturedMinor, 3500);
    assert.equal(novDaily.days[6].refundedMinor, 3500);
    assert.equal(novDaily.days[6].netCapturedMinor, 0);
    assert.equal(novDaily.days[6].captureCount, 1);
  });

  it('12. /api/payments KPI metrics remain invariant under table filters and match authoritative captures', async () => {
    const unfilteredRes = await paymentsGET(
      new NextRequest('http://localhost:3000/api/payments', {
        headers: { 'x-demo-user-email': merchantAEmail },
      })
    );
    assert.equal(unfilteredRes.status, 200);
    const unfilteredBody = await unfilteredRes.json();

    const filteredRes = await paymentsGET(
      new NextRequest(
        'http://localhost:3000/api/payments?status=CREATED&search=NON_EXISTENT_QUERY_XYZ',
        {
          headers: { 'x-demo-user-email': merchantAEmail },
        }
      )
    );
    assert.equal(filteredRes.status, 200);
    const filteredBody = await filteredRes.json();

    // Table pagination drops to 0 rows, but Total Capture KPI remains identical and includes PARTIALLY_REFUNDED + CAPTURED + COMPLETED
    assert.equal(filteredBody.payments.length, 0);
    assert.deepEqual(filteredBody.metrics.capturedByCurrency, unfilteredBody.metrics.capturedByCurrency);
    assert.equal(
      filteredBody.metrics.totalCapturedMinor,
      unfilteredBody.metrics.totalCapturedMinor
    );

    const summaryUsd = await CaptureAnalyticsService.getSummary(merchantASession, {
      currency: 'USD',
      timezone: 'Asia/Kolkata',
    });
    const usdMetric = unfilteredBody.metrics.capturedByCurrency.find(
      (c: { currency: string }) => c.currency === 'USD'
    );
    assert.ok(usdMetric);
    assert.equal(usdMetric.totalAmountMinor, summaryUsd.lifetime.grossCapturedMinor);
    assert.equal(usdMetric.count, summaryUsd.lifetime.captureCount);
  });

  it('13. RESOLUTION_MANAGER inherits proper org or platform scope across OverviewService and CaptureAnalyticsService', async () => {
    const orgMgrEmail = `orgmgr.${runId}@test.resolvegraph.local`;
    const platMgrEmail = `platmgr.${runId}@test.resolvegraph.local`;
    const [orgMgr, platMgr] = await Promise.all([
      prisma.user.create({
        data: {
          email: orgMgrEmail,
          fullName: 'Test Org Resolution Manager',
          role: UserRole.RESOLUTION_MANAGER,
          isPlatformAdmin: false,
          isActive: true,
          organization: 'Capture Test Store A',
        },
      }),
      prisma.user.create({
        data: {
          email: platMgrEmail,
          fullName: 'Test Platform Resolution Manager',
          role: UserRole.RESOLUTION_MANAGER,
          isPlatformAdmin: false,
          isActive: true,
          organization: 'ResolveGraph Platform',
        },
      }),
    ]);

    try {
      await prisma.organizationMember.create({
        data: {
          userId: orgMgr.id,
          organizationId: orgAId,
          role: 'RESOLUTION_MANAGER',
          isActive: true,
        },
      });

      const orgMgrSession: AuthenticatedUser = {
        id: orgMgr.id,
        email: orgMgrEmail,
        name: orgMgr.fullName,
        fullName: orgMgr.fullName,
        role: UserRole.RESOLUTION_MANAGER,
        isPlatformAdmin: false,
        isActive: true,
        avatarUrl: null,
        organization: orgMgr.organization,
        orgMemberships: [
          {
            organizationId: orgAId,
            role: 'RESOLUTION_MANAGER',
            organization: {
              id: orgAId,
              name: 'Capture Test Store A',
              slug: `capture-store-a-${runId}`,
            },
          },
        ],
      };

      const platMgrSession: AuthenticatedUser = {
        id: platMgr.id,
        email: platMgrEmail,
        name: platMgr.fullName,
        fullName: platMgr.fullName,
        role: UserRole.RESOLUTION_MANAGER,
        isPlatformAdmin: false,
        isActive: true,
        avatarUrl: null,
        organization: platMgr.organization,
        orgMemberships: [],
      };

      const [orgMgrOverview, orgMgrCapture, platMgrOverview, platMgrCapture] = await Promise.all([
        OverviewService.getScopedOverview(orgMgrSession),
        CaptureAnalyticsService.getSummary(orgMgrSession, {
          currency: 'USD',
          timezone: 'Asia/Kolkata',
        }),
        OverviewService.getScopedOverview(platMgrSession),
        CaptureAnalyticsService.getSummary(platMgrSession, {
          currency: 'USD',
          timezone: 'Asia/Kolkata',
        }),
      ]);

      assert.equal(orgMgrOverview.user.roleTitle, 'Resolution Manager');
      assert.equal(orgMgrOverview.kpis.payments.title, 'Monitored Sales');
      assert.ok(orgMgrOverview.totalCapture);
      assert.equal(orgMgrOverview.totalCapture.grossCapturedMinor, orgMgrCapture.lifetime.grossCapturedMinor);

      assert.equal(platMgrOverview.user.roleTitle, 'Resolution Manager');
      assert.equal(platMgrOverview.kpis.payments.title, 'Open Cases');
      assert.ok(platMgrOverview.totalCapture);
      assert.equal(
        platMgrOverview.totalCapture.grossCapturedMinor,
        platMgrCapture.lifetime.grossCapturedMinor
      );
      assert.ok(platMgrCapture.lifetime.grossCapturedMinor > orgMgrCapture.lifetime.grossCapturedMinor);
    } finally {
      await prisma.organizationMember.deleteMany({
        where: { userId: { in: [orgMgr.id, platMgr.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [orgMgr.id, platMgr.id] } },
      });
    }
  });
});
