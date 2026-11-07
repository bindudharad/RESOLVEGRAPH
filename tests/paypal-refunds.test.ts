import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { OrderService } from '../src/server/paypal/services/order.service';
import { CaptureService } from '../src/server/paypal/services/capture.service';
import { RefundService } from '../src/server/paypal/services/refund.service';
import { PayPalMockProvider } from '../src/server/paypal/providers/paypal-mock.provider';
import { AuthenticatedUser } from '../src/server/auth/session';

describe('ResolveGraph PayPal Refunds Suite', () => {
  let buyerAlex: AuthenticatedUser;
  let merchantCarlos: AuthenticatedUser;
  let adminPriya: AuthenticatedUser;
  let orgId: string;

  before(async () => {
    PayPalMockProvider.reset();

    const alex = await prisma.user.findFirstOrThrow({ where: { role: 'BUYER' } });
    buyerAlex = {
      id: alex.id,
      email: alex.email,
      name: alex.fullName,
      fullName: alex.fullName,
      role: alex.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: alex.avatarUrl,
      organization: alex.organization,
      orgMemberships: [],
    };

    const techStoreUser = await prisma.user.findFirstOrThrow({
      where: { email: { contains: 'techstore' } },
      include: { orgMemberships: { include: { organization: true } } },
    });

    merchantCarlos = {
      id: techStoreUser.id,
      email: techStoreUser.email,
      name: techStoreUser.fullName,
      fullName: techStoreUser.fullName,
      role: techStoreUser.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: techStoreUser.avatarUrl,
      organization: techStoreUser.organization,
      orgMemberships: techStoreUser.orgMemberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
        },
      })),
    };

    const priya = await prisma.user.findFirstOrThrow({ where: { isPlatformAdmin: true } });
    adminPriya = {
      id: priya.id,
      email: priya.email,
      name: priya.fullName,
      fullName: priya.fullName,
      role: priya.role,
      isPlatformAdmin: true,
      isActive: true,
      avatarUrl: priya.avatarUrl,
      organization: priya.organization,
      orgMemberships: [],
    };

    orgId = merchantCarlos.orgMemberships[0]?.organizationId;
    assert.ok(orgId, 'Merchant organization must exist');
    assert.equal(RefundService.isAuthorizedRefundApprover(adminPriya, orgId), true);
  });

  it('rejects unauthorized buyers from initiating refunds', async () => {
    const orderResult = await OrderService.createOrder({
      buyerId: buyerAlex.id,
      merchantOrganizationId: orgId,
      items: [{ productReference: 'P1', title: 'Widget', quantity: 1, unitAmountMinor: 5000 }],
    });

    await CaptureService.captureOrder({ providerOrderId: orderResult.paypalOrder.id });

    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: orderResult.payment.id,
            reason: 'Buyer attempting unauthorized refund',
          },
          buyerAlex
        );
      },
      /Unauthorized/
    );
  });

  it('enforces resolution proposal agreement before refunding linked dispute', async () => {
    // Create a proposal in DRAFT state
    const firstCase = await prisma.caseRecord.findFirstOrThrow();
    const draftProposal = await prisma.resolutionProposal.create({
      data: {
        caseId: firstCase.id,
        organizationId: orgId,
        proposedById: merchantCarlos.id,
        proposalType: 'FULL_REFUND',
        title: 'Draft Refund Proposal',
        description: 'Unagreed proposal',
        amountMinor: 3000,
        currency: 'USD',
        reason: 'Test',
        status: 'PENDING_BUYER',
      },
    });

    const orderResult = await OrderService.createOrder({
      buyerId: buyerAlex.id,
      merchantOrganizationId: orgId,
      items: [{ productReference: 'P2', title: 'Item', quantity: 1, unitAmountMinor: 3000 }],
    });
    await CaptureService.captureOrder({ providerOrderId: orderResult.paypalOrder.id });

    // Attempt refund linking to unagreed proposal
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: orderResult.payment.id,
            reason: 'Refund based on draft proposal',
            resolutionProposalId: draftProposal.id,
          },
          merchantCarlos
        );
      },
      /Proposal status must be AGREED/
    );

    // Update proposal to AGREED
    await prisma.resolutionProposal.update({
      where: { id: draftProposal.id },
      data: { status: 'AGREED' },
    });

    // Now refund must succeed
    const refundSuccess = await RefundService.executeRefund(
      {
        paymentId: orderResult.payment.id,
        reason: 'Mutual agreement reached',
        resolutionProposalId: draftProposal.id,
      },
      merchantCarlos
    );

    assert.equal(refundSuccess.refund.status, 'COMPLETED');
    assert.equal(refundSuccess.refund.amountMinor, 3000);

    // Verify proposal transitioned to COMPLETED
    const updatedProposal = await prisma.resolutionProposal.findUnique({
      where: { id: draftProposal.id },
    });
    assert.equal(updatedProposal?.status, 'COMPLETED');
  });

  it('manages partial refunds, calculates balance, and rejects over-refunds', async () => {
    // Create $100 order (10000 minor units)
    const orderResult = await OrderService.createOrder({
      buyerId: buyerAlex.id,
      merchantOrganizationId: orgId,
      items: [{ productReference: 'P3', title: 'Monitor', quantity: 1, unitAmountMinor: 10000 }],
    });
    await CaptureService.captureOrder({ providerOrderId: orderResult.paypalOrder.id });

    // 1. Partial refund of $40 (4000 minor units)
    const r1 = await RefundService.executeRefund(
      {
        paymentId: orderResult.payment.id,
        amountMinor: 4000,
        reason: 'Partial scratch discount',
      },
      merchantCarlos
    );
    assert.equal(r1.refund.amountMinor, 4000);

    let order = await prisma.commerceOrder.findUnique({ where: { id: orderResult.order.id } });
    assert.equal(order?.status, 'PARTIALLY_REFUNDED');

    // 2. Reject over-refund attempt ($70 requested when only $60 remains)
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: orderResult.payment.id,
            amountMinor: 7000,
            reason: 'Excessive refund',
          },
          merchantCarlos
        );
      },
      /exceeds remaining refundable balance/
    );

    // 3. Second partial refund of remaining $60 (6000 minor units)
    const r2 = await RefundService.executeRefund(
      {
        paymentId: orderResult.payment.id,
        amountMinor: 6000,
        reason: 'Remaining balance refund',
      },
      merchantCarlos
    );
    assert.equal(r2.refund.amountMinor, 6000);

    order = await prisma.commerceOrder.findUnique({ where: { id: orderResult.order.id } });
    assert.equal(order?.status, 'REFUNDED');

    // 4. Reject any further refund on fully refunded payment
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: orderResult.payment.id,
            amountMinor: 1000,
            reason: 'After full refund',
          },
          merchantCarlos
        );
      },
      /already been fully refunded/
    );
  });

  it('returns identical transaction when re-using idempotency key without re-deducting', async () => {
    const orderResult = await OrderService.createOrder({
      buyerId: buyerAlex.id,
      merchantOrganizationId: orgId,
      items: [{ productReference: 'P4', title: 'Lamp', quantity: 1, unitAmountMinor: 2500 }],
    });
    await CaptureService.captureOrder({ providerOrderId: orderResult.paypalOrder.id });

    const key = `REF-IDEMPOTENT-${Date.now()}`;

    // First refund call
    const firstCall = await RefundService.executeRefund(
      {
        paymentId: orderResult.payment.id,
        amountMinor: 2500,
        reason: 'Idempotency test',
        idempotencyKey: key,
      },
      merchantCarlos
    );
    assert.equal(firstCall.isRetry, false);

    // Second refund call with identical key
    const secondCall = await RefundService.executeRefund(
      {
        paymentId: orderResult.payment.id,
        amountMinor: 2500,
        reason: 'Idempotency test',
        idempotencyKey: key,
      },
      merchantCarlos
    );

    assert.equal(secondCall.isRetry, true);
    assert.equal(secondCall.refund.id, firstCall.refund.id);
  });
});
