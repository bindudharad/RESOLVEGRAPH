import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { SharedResolutionService } from '../src/server/services/shared-resolution.service';

describe('RESOLVEGRAPH Version 2.0: Shared Resolution & Financial Orchestration Suite', () => {
  let testCaseId: string;
  let testBuyerId: string;
  let testMerchantId: string;
  let testManagerId: string;
  let agreedProposalId: string;
  let pendingProposalId: string;
  const testOrgId = 'org_techstore';

  before(async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    testBuyerId = buyer?.id || 'usr_buyer_alex';

    const merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    testMerchantId = merchant?.id || 'usr_techstore_merchant';

    const manager = await prisma.user.findFirst({
      where: { OR: [{ role: 'RESOLUTION_MANAGER' }, { role: 'ADMIN' }] },
    });
    testManagerId = manager?.id || 'usr_priya_admin';

    // Create test case
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `CASE-ROOM-${Date.now()}`,
        title: 'Shared Resolution Room Test Case',
        description: 'Test case for bilateral communication and financial safeguards.',
        category: 'NOT_AS_DESCRIBED',
        buyerId: testBuyerId,
        merchantId: testMerchantId,
        organizationId: testOrgId,
        amountMinor: 10000, // $100.00
        currency: 'USD',
      },
    });
    testCaseId = c.id;

    // Create an order & payment for financial safeguard testing
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `ORD-ROOM-${Date.now()}`,
        buyerId: testBuyerId,
        merchantOrganizationId: testOrgId,
        caseId: testCaseId,
        totalAmountMinor: 10000,
        currency: 'USD',
        status: 'CAPTURED',
      },
    });

    await prisma.payPalPayment.create({
      data: {
        commerceOrderId: order.id,
        providerOrderId: `PAY-ROOM-${Date.now()}`,
        captureId: `CAP-ROOM-${Date.now()}`,
        amountMinor: 10000,
        currency: 'USD',
        paymentStatus: 'COMPLETED',
      },
    });

    // Create AGREED proposal ($50.00 refund)
    const p1 = await prisma.resolutionProposal.create({
      data: {
        caseId: testCaseId,
        organizationId: testOrgId,
        proposedById: testMerchantId,
        proposalType: 'PARTIAL_REFUND',
        title: '50% Partial Refund',
        description: 'Agreed 50% refund settlement',
        amountMinor: 5000,
        currency: 'USD',
        reason: 'Capacity mismatch resolution',
        status: 'AGREED',
      },
    });
    agreedProposalId = p1.id;

    // Create DRAFT proposal ($150.00 exceeding balance)
    const p2 = await prisma.resolutionProposal.create({
      data: {
        caseId: testCaseId,
        organizationId: testOrgId,
        proposedById: testBuyerId,
        proposalType: 'FULL_REFUND',
        title: 'Excessive Refund Claim',
        description: 'Claims more than paid',
        amountMinor: 15000,
        currency: 'USD',
        reason: 'Unreasonable claim',
        status: 'DRAFT',
      },
    });
    pendingProposalId = p2.id;
  });

  after(async () => {
    if (testCaseId) {
      await prisma.sharedRoomMessage.deleteMany({ where: { caseId: testCaseId } });
      await prisma.resolutionProposal.deleteMany({ where: { caseId: testCaseId } });
      await prisma.payPalPayment.deleteMany({ where: { commerceOrder: { caseId: testCaseId } } });
      await prisma.commerceOrder.deleteMany({ where: { caseId: testCaseId } });
      await prisma.caseRecord.delete({ where: { id: testCaseId } }).catch(() => {});
    }
  });

  test('Module 16: buyer and merchant exchange messages in the Shared Resolution Room', async () => {
    // 1. Buyer posts message
    const msg1 = await SharedResolutionService.postMessage({
      caseId: testCaseId,
      senderId: testBuyerId,
      content: 'I verified the package tape was intact, but inside was a 512 GB SSD. Can you send the 1 TB model?',
    });

    assert.ok(msg1.id);
    assert.equal(msg1.senderRole, 'BUYER');

    // 2. Merchant replies
    const msg2 = await SharedResolutionService.postMessage({
      caseId: testCaseId,
      senderId: testMerchantId,
      content: 'We reviewed our packing records. We are happy to issue a replacement if you return the 512 GB unit.',
    });

    assert.ok(msg2.id);
    assert.equal(msg2.senderRole, 'MERCHANT');

    const messages = await SharedResolutionService.listMessages(testCaseId, {
      id: testBuyerId,
      role: 'BUYER',
      isPlatformAdmin: false,
    });
    assert.equal(messages.length, 2);
  });

  test('Module 16: role-based visibility protects internal manager notes from buyer inspection', async () => {
    // Manager posts internal note
    await SharedResolutionService.postMessage({
      caseId: testCaseId,
      senderId: testManagerId,
      content: 'INTERNAL AUDIT NOTE: Merchant warehouse scan log indicates possible SKU barcode bin misplacement.',
      isInternalOnly: true,
    });

    // Buyer view: MUST NOT see internal note
    const buyerView = await SharedResolutionService.listMessages(testCaseId, {
      id: testBuyerId,
      role: 'BUYER',
      isPlatformAdmin: false,
    });
    assert.equal(buyerView.some((m) => m.content.includes('INTERNAL AUDIT NOTE')), false);

    // Manager view: MUST see internal note
    const managerView = await SharedResolutionService.listMessages(testCaseId, {
      id: testManagerId,
      role: 'RESOLUTION_MANAGER',
      isPlatformAdmin: false,
    });
    assert.equal(managerView.some((m) => m.content.includes('INTERNAL AUDIT NOTE')), true);
  });

  test('Module 16: financial safeguards reject unagreed proposal and over-refund attempts', async () => {
    // 1. Test DRAFT proposal (not agreed)
    const checkUnagreed = await SharedResolutionService.validateFinancialSafeguards(
      testCaseId,
      pendingProposalId,
      { id: testMerchantId, role: 'MERCHANT', organization: testOrgId, isPlatformAdmin: false }
    );
    assert.equal(checkUnagreed.isEligible, false);
    assert.ok(checkUnagreed.reasons.some((r) => r.includes('AGREED')));
    assert.ok(checkUnagreed.reasons.some((r) => r.includes('exceeds remaining refundable balance')));

    // 2. Test unauthorized buyer trying to execute refund
    const checkUnauthorized = await SharedResolutionService.validateFinancialSafeguards(
      testCaseId,
      agreedProposalId,
      { id: testBuyerId, role: 'BUYER', organization: null, isPlatformAdmin: false }
    );
    assert.equal(checkUnauthorized.isEligible, false);
    assert.ok(checkUnauthorized.reasons.some((r) => r.includes('Unauthorized actor')));
  });

  test('Module 16: financial safeguards approve eligible agreed proposal with authorized merchant', async () => {
    const checkAgreed = await SharedResolutionService.validateFinancialSafeguards(
      testCaseId,
      agreedProposalId,
      { id: testMerchantId, role: 'MERCHANT', organization: testOrgId, isPlatformAdmin: false }
    );

    assert.equal(checkAgreed.isEligible, true);
    assert.equal(checkAgreed.reasons.length, 0);
    assert.equal(checkAgreed.refundAmountMinor, 5000); // $50.00
    assert.equal(checkAgreed.remainingBalanceMinor, 10000);
  });
});
