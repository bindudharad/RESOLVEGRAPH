import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { OrderService } from '../src/server/paypal/services/order.service';
import { CaptureService } from '../src/server/paypal/services/capture.service';
import { RefundService } from '../src/server/paypal/services/refund.service';
import { FinancialActionGuardrails } from '../src/server/agents/guardrails/financial-action-guardrails';
import { AuthenticatedUser } from '../src/server/auth/session';
import { UserRole, OrganizationRole } from '../src/generated/prisma/client';

describe('PHASE 7 — Financial Safeguards Negative Security Suite', () => {
  let buyerAlex: AuthenticatedUser;
  let merchantCarlos: AuthenticatedUser;
  let merchantStaffViewer: AuthenticatedUser;
  let testOrgId: string;
  let testPaymentId: string;
  let testCaptureId: string;

  before(async () => {
    // 1. Setup Organization
    const org = await prisma.organization.upsert({
      where: { slug: 'sec-guard-test-org' },
      update: {},
      create: {
        name: 'Security Guardrails Org',
        slug: 'sec-guard-test-org',
      },
    });
    testOrgId = org.id;

    // 2. Setup Buyer
    const buyer = await prisma.user.upsert({
      where: { email: 'sec_buyer@example.com' },
      update: {},
      create: {
        email: 'sec_buyer@example.com',
        fullName: 'Security Buyer',
        name: 'Security Buyer',
        role: UserRole.BUYER,
      },
    });
    buyerAlex = {
      id: buyer.id,
      email: buyer.email,
      name: buyer.fullName,
      fullName: buyer.fullName,
      role: buyer.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: null,
      orgMemberships: [],
    };

    // 3. Setup Merchant Owner / Org Admin
    const merchant = await prisma.user.upsert({
      where: { email: 'sec_merchant@example.com' },
      update: {},
      create: {
        email: 'sec_merchant@example.com',
        fullName: 'Security Merchant Owner',
        name: 'Security Merchant Owner',
        role: UserRole.MERCHANT,
      },
    });
    merchantCarlos = {
      id: merchant.id,
      email: merchant.email,
      name: merchant.fullName,
      fullName: merchant.fullName,
      role: merchant.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: testOrgId,
      orgMemberships: [{
        organizationId: testOrgId,
        role: OrganizationRole.OWNER,
        organization: { id: testOrgId, name: 'Security Guardrails Org', slug: 'sec-guard-test-org' },
      }],
    };

    // 4. Setup Merchant Staff with VIEWER role (unauthorized for financial sign-off)
    const staff = await prisma.user.upsert({
      where: { email: 'sec_staff_viewer@example.com' },
      update: {},
      create: {
        email: 'sec_staff_viewer@example.com',
        fullName: 'Security Staff Viewer',
        name: 'Security Staff Viewer',
        role: UserRole.MERCHANT,
      },
    });
    merchantStaffViewer = {
      id: staff.id,
      email: staff.email,
      name: staff.fullName,
      fullName: staff.fullName,
      role: staff.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: null,
      organization: testOrgId,
      orgMemberships: [{
        organizationId: testOrgId,
        role: OrganizationRole.VIEWER,
        organization: { id: testOrgId, name: 'Security Guardrails Org', slug: 'sec-guard-test-org' },
      }],
    };

    // 5. Create an initial paid order to test refunds against
    const orderResult = await OrderService.createOrder({
      buyerId: buyerAlex.id,
      merchantOrganizationId: testOrgId,
      currency: 'USD',
      items: [{ productReference: 'SEC-P1', title: 'Security Test Item', quantity: 1, unitAmountMinor: 10000 }],
    });
    const captureResult = await CaptureService.captureOrder({
      providerOrderId: orderResult.paypalOrder.id,
      actorUserId: merchantCarlos.id,
    });
    testPaymentId = captureResult.payment.id;
    testCaptureId = captureResult.captureResult?.id || captureResult.payment.captureId!;
    assert.ok(testPaymentId);
    assert.ok(testCaptureId);
  });

  // TEST 1: Autonomous Refund Execution Attempt by Agent Guardrail
  it('1. Rejects autonomous refund execution attempt via FinancialActionGuardrails', () => {
    assert.throws(
      () => {
        FinancialActionGuardrails.inspectAction('execute_refund', {
          paymentId: testPaymentId,
          amountMinor: 5000,
        });
      },
      /Autonomous execution of "execute_refund" is strictly forbidden/
    );
  });

  // TEST 2: Refund Attempt as Unauthorized Buyer
  it('2. Rejects refund attempt initiated by unauthorized buyer', async () => {
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          { paymentId: testPaymentId, reason: 'Buyer unauthorized refund attempt' },
          buyerAlex
        );
      },
      /Unauthorized/
    );
  });

  // TEST 3: Refund Sign-off Attempt as Unauthorized Merchant Staff (Viewer)
  it('3. Rejects refund sign-off as unauthorized merchant staff (Viewer)', () => {
    const authCheck = FinancialActionGuardrails.canUserSignApproval(
      {
        id: merchantStaffViewer.id,
        email: merchantStaffViewer.email,
        fullName: merchantStaffViewer.fullName,
        role: merchantStaffViewer.role as UserRole,
        organizationId: testOrgId,
        orgRole: OrganizationRole.VIEWER,
        isPlatformAdmin: false,
      },
      'REFUND_PROPOSAL',
      testOrgId
    );
    assert.strictEqual(authCheck.authorized, false);
    assert.match(authCheck.reason || '', /Only merchant organization Owners or Org Admins/);
  });

  // TEST 4: Refund with Wrong / Non-existent Payment ID
  it('4. Rejects refund with invalid or non-existent payment ID', async () => {
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          { paymentId: 'non-existent-payment-cuid-999', reason: 'Invalid payment ID' },
          merchantCarlos
        );
      },
      /Payment record not found/
    );
  });

  // TEST 5: Refund with Modified / Excessive Amount
  it('5. Rejects refund with amount exceeding remaining captured balance', async () => {
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: testPaymentId,
            amountMinor: 9999999, // Way higher than 10000
            reason: 'Excessive refund amount attempt',
          },
          merchantCarlos
        );
      },
      /Requested refund .* exceeds remaining refundable balance/
    );
  });

  // TEST 6: Refund with Modified / Incompatible Currency
  it('6. Rejects refund attempt when proposal currency mismatches payment currency', async () => {
    const caseRecord = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-SEC-CURR-${Date.now()}`,
        title: 'Currency Mismatch Case',
        category: 'REFUND_DISPUTE',
        priority: 'MEDIUM',
        amountMinor: 5000,
        currency: 'EUR', // Mismatched currency
        buyer: { connect: { id: buyerAlex.id } },
        merchant: { connect: { id: merchantCarlos.id } },
        organization: { connect: { id: testOrgId } },
        description: 'Testing currency mismatch rejection',
      },
    });

    const proposal = await prisma.resolutionProposal.create({
      data: {
        caseId: caseRecord.id,
        organizationId: testOrgId,
        proposedById: merchantCarlos.id,
        proposalType: 'PARTIAL_REFUND',
        title: 'Mismatched Currency Proposal',
        description: 'Mismatched currency',
        amountMinor: 5000,
        currency: 'EUR',
        reason: 'Currency test',
        status: 'PENDING_BUYER',
      },
    });

    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: testPaymentId,
            amountMinor: 5000,
            resolutionProposalId: proposal.id,
            reason: 'Refund with unagreed proposal',
          },
          merchantCarlos
        );
      },
      /Proposal status must be AGREED/
    );
  });

  // TEST 7: Refund with Unagreed / Expired Proposal
  it('7. Rejects refund when resolution proposal is not in AGREED status', async () => {
    const caseRecord = await prisma.caseRecord.findFirstOrThrow();
    const rejectedProposal = await prisma.resolutionProposal.create({
      data: {
        caseId: caseRecord.id,
        organizationId: testOrgId,
        proposedById: merchantCarlos.id,
        proposalType: 'PARTIAL_REFUND',
        title: 'Rejected Proposal',
        description: 'Buyer rejected this proposal',
        amountMinor: 2000,
        currency: 'USD',
        reason: 'Expired or rejected',
        status: 'BUYER_REJECTED',
      },
    });

    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: testPaymentId,
            resolutionProposalId: rejectedProposal.id,
            reason: 'Attempting refund on rejected proposal',
          },
          merchantCarlos
        );
      },
      /Proposal status must be AGREED/
    );
  });

  // TEST 8: Refund with Altered / Tampered Approval Hash
  it('8. Detects altered approval arguments hash tampering', () => {
    const originalArgs = {
      caseId: 'RG-1001',
      paymentId: testPaymentId,
      amountMinor: 4999,
      currency: 'USD',
    };
    const validHash = FinancialActionGuardrails.computeArgumentsHash(originalArgs);

    // Tampered payload with modified amount
    const tamperedArgs = {
      caseId: 'RG-1001',
      paymentId: testPaymentId,
      amountMinor: 9999, // Altered
      currency: 'USD',
    };

    const isMatch = FinancialActionGuardrails.verifyArgumentsHash(tamperedArgs, validHash);
    assert.strictEqual(isMatch, false, 'Tampered arguments must fail hash verification');
  });

  // TEST 9: Idempotency Protection with Duplicated Idempotency Key
  it('9. Idempotently returns existing refund on duplicated idempotency key without double refunding', async () => {
    const idempotencyKey = `neg-sec-idem-${Date.now()}`;
    const firstRefund = await RefundService.executeRefund(
      {
        paymentId: testPaymentId,
        amountMinor: 1000,
        idempotencyKey,
        reason: 'First execution',
      },
      merchantCarlos
    );
    assert.strictEqual(firstRefund.refund.status, 'COMPLETED');

    // Duplicate call with identical key
    const duplicateRefund = await RefundService.executeRefund(
      {
        paymentId: testPaymentId,
        amountMinor: 1000,
        idempotencyKey,
        reason: 'Duplicate retry',
      },
      merchantCarlos
    );
    assert.strictEqual(duplicateRefund.refund.id, firstRefund.refund.id);
  });

  // TEST 10: Cross-Tenant Organization Mismatch Rejection
  it('10. Rejects refund approval sign-off across mismatched organization boundaries', () => {
    const competitorOrgId = 'org-competitor-xyz';
    const authCheck = FinancialActionGuardrails.canUserSignApproval(
      {
        id: merchantCarlos.id,
        email: merchantCarlos.email,
        fullName: merchantCarlos.fullName,
        role: merchantCarlos.role as UserRole,
        organizationId: testOrgId,
        orgRole: OrganizationRole.OWNER,
        isPlatformAdmin: false,
      },
      'REFUND_PROPOSAL',
      competitorOrgId // Mismatched organization
    );
    assert.strictEqual(authCheck.authorized, false);
    assert.match(authCheck.reason || '', /User does not belong to the organization/);
  });

  // TEST 11: Refund After Negative Amount Validation
  it('11. Rejects refund with zero or negative amount', async () => {
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: testPaymentId,
            amountMinor: -500,
            reason: 'Negative amount attempt',
          },
          merchantCarlos
        );
      },
      /Refund amount must be greater than zero/
    );
  });

  // TEST 12: Concurrent / Repeated Payout Exhaustion Rejection
  it('12. Rejects subsequent refund when remaining captured balance is exhausted', async () => {
    // Current remaining is 10000 - 1000 = 9000
    // Refund the remaining 9000
    await RefundService.executeRefund(
      {
        paymentId: testPaymentId,
        amountMinor: 9000,
        reason: 'Exhaust remaining balance',
      },
      merchantCarlos
    );

    // Now balance is 0. Next attempt must be rejected.
    await assert.rejects(
      async () => {
        await RefundService.executeRefund(
          {
            paymentId: testPaymentId,
            amountMinor: 100,
            reason: 'Attempting refund on exhausted balance',
          },
          merchantCarlos
        );
      },
      /already been fully refunded|exceeds remaining refundable balance/
    );
  });
});
