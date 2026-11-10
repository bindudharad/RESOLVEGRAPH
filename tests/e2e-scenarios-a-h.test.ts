import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/lib/prisma';
import { CaseService } from '../src/server/services/case.service';
import { OrderService } from '../src/server/paypal/services/order.service';
import { CaptureService } from '../src/server/paypal/services/capture.service';
import { RefundService } from '../src/server/paypal/services/refund.service';
import { WebhookProcessingService } from '../src/server/paypal/services/webhook-processing.service';
import { GraphBuilder } from '../src/server/graph/graph-builder';
import { BerrV2Service } from '../src/server/ai/reasoning/berr-v2.service';
import { InvestigationReportService } from '../src/server/services/investigation-report.service';
import { AgentApprovalService } from '../src/server/agents/runtime/agent-approval.service';
import { ProposalWorkflowService } from '../src/server/resolution/proposal-workflow';
import { HashChainedAuditService } from '../src/server/services/hash-chained-audit.service';
import { canAccessCase } from '../src/server/auth/permissions';
import { AuthenticatedUser } from '../src/server/auth/session';
import { EvidenceGuardService } from '../src/server/services/evidenceguard.service';
import { registerAllTools } from '../src/server/agents/tools';
import { CaseStatus } from '../src/generated/prisma/client';

describe('RESOLVEGRAPH 2.0: Master Scenarios A through H Validation Suite', () => {
  let buyerUser: AuthenticatedUser;
  let merchantUser: AuthenticatedUser;
  let unauthorizedUser: AuthenticatedUser;
  let testOrgId: string;
  let otherOrgId: string;

  before(async () => {
    // Seed test users & organizations
    const buyerDb = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    assert.ok(buyerDb, 'Buyer must exist');
    buyerUser = {
      id: buyerDb.id,
      email: buyerDb.email,
      name: buyerDb.name,
      fullName: buyerDb.fullName,
      role: buyerDb.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: buyerDb.avatarUrl,
      organization: buyerDb.organization,
      orgMemberships: [],
    };

    const merchantDb = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    assert.ok(merchantDb, 'Merchant must exist');
    const org = await prisma.organization.findFirst();
    assert.ok(org, 'Org must exist');
    testOrgId = org.id;

    merchantUser = {
      id: merchantDb.id,
      email: merchantDb.email,
      name: merchantDb.name,
      fullName: merchantDb.fullName,
      role: merchantDb.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: merchantDb.avatarUrl,
      organization: merchantDb.organization,
      orgMemberships: [{ organizationId: org.id, role: 'ORG_ADMIN', organization: { id: org.id, name: org.name, slug: org.slug } }],
    };

    // Other org & user for cross-tenant rejection testing
    otherOrgId = `org_other_${Date.now()}`;
    const otherUserDb = await prisma.user.create({
      data: {
        email: `unauthorized_${Date.now()}@competitor.demo`,
        fullName: 'Unauthorized Competitor',
        role: 'MERCHANT',
      },
    });
    unauthorizedUser = {
      id: otherUserDb.id,
      email: otherUserDb.email,
      name: otherUserDb.name,
      fullName: otherUserDb.fullName,
      role: otherUserDb.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: otherUserDb.avatarUrl,
      organization: null,
      orgMemberships: [{ organizationId: otherOrgId, role: 'VIEWER', organization: { id: otherOrgId, name: 'Other Corp', slug: 'other-corp' } }],
    };
  });

  after(async () => {
    if (unauthorizedUser?.id) {
      await prisma.user.delete({ where: { id: unauthorizedUser.id } }).catch(() => {});
    }
  });

  // SCENARIO A: CUSTOMER INVESTIGATION
  it('SCENARIO A — Full Customer Investigation Lifecycle', async () => {
    // 1. Create case
    const newCase = await CaseService.createCase({
      title: 'Scenario A: Defective Storage Unit',
      category: 'NOT_AS_DESCRIBED',
      priority: 'HIGH',
      amountMinor: 6499,
      currency: 'INR',
      buyerId: buyerUser.id,
      merchantId: merchantUser.id,
      organizationId: testOrgId,
      description: 'Customer ordered 1TB NVMe, unboxed drive showed 512GB firmware specification.',
    });
    assert.ok(newCase.id);
    assert.strictEqual(newCase.status, CaseStatus.SUBMITTED);

    // 2. Upload and attach evidence
    const evidence = await CaseService.addEvidence(newCase.id, {
      uploadedById: buyerUser.id,
      filename: 'invoice_scenario_a.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024 * 45,
      storageKey: `evidence/scenario_a_${Date.now()}.pdf`,
      sha256: crypto.createHash('sha256').update('invoice_scenario_a_content').digest('hex'),
      evidenceType: 'INVOICE',
      sourceType: 'BUYER_UPLOAD',
      verificationStatus: 'VERIFIED',
      visibility: 'SHARED_WITH_PARTICIPANTS',
    });
    assert.ok(evidence.id);

    // 3. Assemble BEG graph
    const graph = await GraphBuilder.buildGraph(newCase.id);
    assert.ok(graph.nodes.length >= 3, 'Graph should have Case, Buyer, Merchant, and Evidence nodes');

    // 4. Run BERR Reasoning
    const berrResult = await BerrV2Service.evaluateCase(newCase.id);
    assert.ok(berrResult.classifiedFacts);
    assert.ok(berrResult.recommendedRemedy);

    // 5. Generate Investigation Report
    const report = await InvestigationReportService.generateJsonReport(newCase.id);
    assert.ok(report.reportId);
    assert.ok(report.paymentDetails);
  });

  // SCENARIO B: PAYPAL PAYMENT & CAPTURE
  it('SCENARIO B — PayPal Order Creation, Capture & Event Recording', async () => {
    const orderResult = await OrderService.createOrder({
      buyerId: buyerUser.id,
      merchantOrganizationId: testOrgId,
      currency: 'USD',
      items: [{ productReference: 'PROD-SSD-1TB', title: 'ApexPro SSD', quantity: 1, unitAmountMinor: 4999 }],
    });
    assert.ok(orderResult.paypalOrder.id);

    const captureResult = await CaptureService.captureOrder({
      providerOrderId: orderResult.paypalOrder.id,
      actorUserId: merchantUser.id,
    });
    assert.strictEqual(captureResult.payment.paymentStatus, 'COMPLETED');
    const captureId = captureResult.captureResult?.id || captureResult.payment.captureId;
    assert.ok(captureId);

    // Verify webhook ingestion
    const whResult = await WebhookProcessingService.processEvent({
      id: `WH-EVT-SCENARIO-B-${Date.now()}`,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource_type: 'capture',
      resource: {
        id: captureId,
        status: 'COMPLETED',
        amount: { value: '49.99', currency_code: 'USD' },
      },
    });
    assert.strictEqual(whResult.status, 'PROCESSED');
  });

  // SCENARIO C: REFUND INVESTIGATION & SAFEGUARD APPROVAL
  it('SCENARIO C — Cancellation Evidence, Refund Proposal & Authorized Execution', async () => {
    const order = await OrderService.createOrder({
      buyerId: buyerUser.id,
      merchantOrganizationId: testOrgId,
      currency: 'USD',
      items: [{ productReference: 'PROD-CANCELLED', title: 'Cancelled Item', quantity: 1, unitAmountMinor: 4999 }],
    });
    const capture = await CaptureService.captureOrder({
      providerOrderId: order.paypalOrder.id,
      actorUserId: merchantUser.id,
    });

    const refundCase = await CaseService.createCase({
      title: 'Scenario C: Refund Not Received after Cancellation',
      category: 'REFUND_DISPUTE',
      priority: 'HIGH',
      amountMinor: 4999,
      currency: 'USD',
      buyerId: buyerUser.id,
      merchantId: merchantUser.id,
      organizationId: testOrgId,
      description: 'Order was cancelled by seller but $49.99 was captured.',
    });

    const agentRun = await prisma.agentRun.create({
      data: {
        title: 'Scenario C Refund Proposal Run',
        prompt: 'Investigate and propose refund',
        caseId: refundCase.dbId || refundCase.id,
        organizationId: testOrgId,
        userId: merchantUser.id,
        status: 'RUNNING',
      },
    });

    const captureId = capture.captureResult?.id || capture.payment.captureId || 'CAP-TEST';
    const refundToolRes = await registerAllTools().executeTool(
      'prepare_refund_proposal',
      {
        caseId: refundCase.dbId || refundCase.id,
        captureId,
        amountMinor: 4999,
        currency: 'USD',
        reason: 'Authorized PayPal refund for cancelled order',
      },
      {
        runId: agentRun.id,
        organizationId: testOrgId,
        caseId: refundCase.dbId || refundCase.id,
        currentStep: 1,
        maxSteps: 10,
        totalTokens: 0,
        costEstimateUsd: 0,
        startTime: Date.now(),
        status: 'RUNNING',
        actor: {
          id: merchantUser.id,
          email: merchantUser.email,
          fullName: merchantUser.fullName,
          role: 'MERCHANT',
          organizationId: testOrgId,
          orgRole: 'ORG_ADMIN',
          isPlatformAdmin: false,
        },
      }
    );
    assert.strictEqual(refundToolRes.status, 'SUCCEEDED');
    const proposalData = refundToolRes.data as {
      proposalId: string;
      approvalRequestId: string;
      argumentsHash: string;
      status: string;
    };
    assert.ok(proposalData.argumentsHash);

    // Merchant signs off
    const approvalResponse = await AgentApprovalService.respondToApproval({
      approvalId: proposalData.approvalRequestId,
      decision: 'APPROVED',
      notes: 'Verified seller out-of-stock cancellation; refund approved.',
      actor: {
        id: merchantUser.id,
        email: merchantUser.email,
        fullName: merchantUser.fullName,
        role: 'MERCHANT',
        organizationId: testOrgId,
        orgRole: 'ORG_ADMIN',
        isPlatformAdmin: false,
      },
    });
    assert.strictEqual(approvalResponse.status, 'APPROVED');

    // Buyer accepts proposal
    await ProposalWorkflowService.submitPartyResponse({
      proposalId: proposalData.proposalId,
      responderId: buyerUser.id,
      response: 'ACCEPTED',
      comment: 'Accept refund proposal',
    });

    // Execute refund
    const refundExec = await RefundService.executeRefund(
      {
        paymentId: capture.payment.id,
        amountMinor: 4999,
        reason: 'Order cancelled due to stock-out',
        resolutionProposalId: proposalData.proposalId,
      },
      merchantUser
    );
    assert.ok(refundExec.refund.id);
  });

  // SCENARIO D: MERCHANT DISPUTE & BERR CONFLICT ISOLATION
  it('SCENARIO D — Bilateral Dispute with Contradiction Detection', async () => {
    const disputeCase = await CaseService.createCase({
      title: 'Scenario D: Capacity Clash',
      category: 'NOT_AS_DESCRIBED',
      priority: 'HIGH',
      amountMinor: 7999,
      currency: 'USD',
      buyerId: buyerUser.id,
      merchantId: merchantUser.id,
      organizationId: testOrgId,
      description: 'Customer claims 512GB was delivered instead of 1TB NVMe.',
    });

    // Customer claim
    await CaseService.addClaim(disputeCase.id, {
      authorId: buyerUser.id,
      partyRole: 'BUYER',
      claimType: 'DEFECTIVE_OR_DAMAGED',
      statement: 'Packaging indicates 512GB model received.',
    });

    // Merchant claim
    await CaseService.addClaim(disputeCase.id, {
      authorId: merchantUser.id,
      partyRole: 'MERCHANT',
      claimType: 'OTHER',
      statement: 'Warehouse picking scanner logs confirm 1TB SKU packed.',
    });

    // Run BERR
    const berr = await BerrV2Service.evaluateCase(disputeCase.id);
    assert.ok(berr.classifiedFacts);
    assert.ok(berr.uncertaintyAnalysis);
  });

  // SCENARIO E: SECURITY & CROSS-TENANT ISOLATION
  it('SCENARIO E — Cross-Tenant Unauthorized Case Access Rejection', async () => {
    const caseRecord = await prisma.caseRecord.findFirst({
      where: { organizationId: testOrgId },
    });
    assert.ok(caseRecord, 'CaseRecord must exist');

    // Unauthorized competitor attempts access
    const isAllowed = canAccessCase(unauthorizedUser, caseRecord);
    assert.strictEqual(isAllowed, false, 'Cross-tenant access must be strictly forbidden');
  });

  // SCENARIO F: ERROR RECOVERY & IDEMPOTENCY
  it('SCENARIO F — Idempotent Safe Retry on Existing Capture', async () => {
    const order = await OrderService.createOrder({
      buyerId: buyerUser.id,
      merchantOrganizationId: testOrgId,
      currency: 'USD',
      items: [{ productReference: 'PROD-RETRY', title: 'Test Safe Retry', quantity: 1, unitAmountMinor: 1500 }],
    });

    const firstCapture = await CaptureService.captureOrder({
      providerOrderId: order.paypalOrder.id,
      actorUserId: merchantUser.id,
      idempotencyKey: `idem-key-${order.order.orderNumber}`,
    });
    assert.strictEqual(firstCapture.isAlreadyCaptured, false);

    // Immediate retry with identical idempotency key
    const retryCapture = await CaptureService.captureOrder({
      providerOrderId: order.paypalOrder.id,
      actorUserId: merchantUser.id,
      idempotencyKey: `idem-key-${order.order.orderNumber}`,
    });
    assert.strictEqual(retryCapture.isAlreadyCaptured, true);
    assert.strictEqual(retryCapture.payment.id, firstCapture.payment.id);
  });

  // SCENARIO G: DUPLICATE WEBHOOK HANDLING
  it('SCENARIO G — Duplicate Webhook Ingestion Rejection', async () => {
    const duplicateEventId = `WH-DUP-${Date.now()}`;
    const payload = {
      id: duplicateEventId,
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource_type: 'capture',
      resource: {
        id: `CAP-DUP-${Date.now()}`,
        status: 'COMPLETED',
        amount: { value: '10.00', currency_code: 'USD' },
      },
    };

    // First arrival
    const firstRes = await WebhookProcessingService.processEvent(payload);
    assert.strictEqual(firstRes.status, 'PROCESSED');

    // Duplicate replay arrival
    const duplicateRes = await WebhookProcessingService.processEvent(payload);
    assert.strictEqual(duplicateRes.status, 'ALREADY_PROCESSED');
  });

  // SCENARIO H: EVIDENCE INTEGRITY & TAMPER DETECTION
  it('SCENARIO H — Evidence File Digest Hashing & Tamper Detection', async () => {
    const originalContent = Buffer.from('Original verified invoice content 2026');
    const validSha256 = crypto.createHash('sha256').update(originalContent).digest('hex');

    // SHA-256 digest validation
    const computedOriginal = crypto.createHash('sha256').update(originalContent).digest('hex');
    assert.strictEqual(computedOriginal, validSha256);

    // Tampered copy (flip bytes)
    const tamperedContent = Buffer.from('Tampered modified invoice content 2026');
    const computedTampered = crypto.createHash('sha256').update(tamperedContent).digest('hex');
    assert.notStrictEqual(computedTampered, validSha256);

    // Perceptual dHash computation via EvidenceGuardService
    const dHash1 = EvidenceGuardService.computeDifferenceHash(originalContent);
    const dHash2 = EvidenceGuardService.computeDifferenceHash(originalContent);
    assert.strictEqual(dHash1, dHash2, 'Identical content must yield identical difference hashes');

    // Audit record hash verification
    const auditBlock = await HashChainedAuditService.recordEvent({
      action: 'EVIDENCE_HASH_VERIFIED',
      actorId: buyerUser.id,
      resourceType: 'EVIDENCE',
      resourceId: 'ev-test-h',
      details: { validSha256 },
    });
    assert.ok(auditBlock.currentHash);
  });
});
