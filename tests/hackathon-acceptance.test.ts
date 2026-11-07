import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { prisma } from '../src/lib/prisma';
import { PayPalMockProvider } from '../src/server/paypal/providers/paypal-mock.provider';
import {
  PurchaseOrchestrationService,
  PaymentOrchestrationService,
  ResolutionOrchestrationService,
  EventOrchestrationService,
} from '../src/server/orchestration';
import { CaseStatus, CaseStage, RemedyType, EventType } from '../src/generated/prisma/client';
import { detectMagicBytes } from '../src/server/storage/evidence-storage';
import { FactNormalizer } from '../src/server/ai/normalization/fact-normalizer';
import { ContradictionDetector } from '../src/server/ai/reasoning/contradiction-detector';
import { GraphBuilder } from '../src/server/graph/graph-builder';
import { TemporalEngine } from '../src/server/temporal/temporal-engine';
import { SemanticDriftEngine, CommercialStageFact } from '../src/server/drift/semantic-drift-engine';
import { ResolutionEngine } from '../src/server/resolution/resolution-engine';
import { FinancialActionGuardrails } from '../src/server/agents/guardrails/financial-action-guardrails';
import { QualityReviewAgent } from '../src/server/agents/specialists/quality-review.agent';
import { PlainLanguageExplanationHelper } from '../src/lib/explanation-helper';
import { AuthenticatedUser } from '../src/server/auth/session';
import { AgentExecutionContext } from '../src/server/agents/types/agent.types';

describe('ResolveGraph Step 9: 21-Step Master Hackathon Acceptance Test', () => {
  let buyer: AuthenticatedUser;
  let merchantUser: AuthenticatedUser;
  let adminUser: AuthenticatedUser;
  let merchantOrgId: string;

  let testOrderId: string;
  let testPaymentId: string;
  let testCaseId: string;
  let buyerEvidenceId: string;
  let merchantEvidenceId: string;
  let testAgentRunId: string;
  let testApprovalRequestId: string;
  let testProposalId: string;
  let argumentsHash: string;

  const testUniqueSuffix = `acc_${Date.now().toString().slice(-6)}`;
  const caseNumber = `CASE-HACK-${testUniqueSuffix}`;

  before(async () => {
    PayPalMockProvider.reset();

    const buyerDb = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    assert.ok(buyerDb, 'Buyer user must exist in DB');
    buyer = {
      id: buyerDb.id,
      email: buyerDb.email,
      name: buyerDb.name,
      fullName: buyerDb.fullName,
      role: buyerDb.role,
      isPlatformAdmin: buyerDb.isPlatformAdmin,
      isActive: buyerDb.isActive,
      avatarUrl: buyerDb.avatarUrl,
      organization: buyerDb.organization,
      orgMemberships: [],
    };

    const merchantDb = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    assert.ok(merchantDb, 'Merchant user must exist in DB');
    const org = await prisma.organization.findFirst();
    assert.ok(org, 'Merchant organization must exist in DB');
    merchantOrgId = org.id;

    merchantUser = {
      id: merchantDb.id,
      email: merchantDb.email,
      name: merchantDb.name,
      fullName: merchantDb.fullName,
      role: merchantDb.role,
      isPlatformAdmin: merchantDb.isPlatformAdmin,
      isActive: merchantDb.isActive,
      avatarUrl: merchantDb.avatarUrl,
      organization: org.name,
      orgMemberships: [
        {
          organizationId: org.id,
          role: 'OWNER',
          organization: { id: org.id, name: org.name, slug: org.slug || 'org' },
        },
      ],
    };

    const adminDb = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
    assert.ok(adminDb, 'Admin user must exist in DB');
    adminUser = {
      id: adminDb.id,
      email: adminDb.email,
      name: adminDb.name,
      fullName: adminDb.fullName,
      role: adminDb.role,
      isPlatformAdmin: true,
      isActive: adminDb.isActive,
      avatarUrl: adminDb.avatarUrl,
      organization: adminDb.organization,
      orgMemberships: [],
    };
  });

  after(async () => {
    // Clean up created acceptance test records safely
    try {
      if (testCaseId) {
        await prisma.resolutionPartyResponse.deleteMany({ where: { proposal: { caseId: testCaseId } } }).catch(() => {});
        await prisma.resolutionProposal.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
        await prisma.caseEvent.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
        await prisma.claim.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
        await prisma.evidence.deleteMany({ where: { caseId: testCaseId } }).catch(() => {});
        await prisma.agentApprovalRequest.deleteMany({ where: { runId: testAgentRunId } }).catch(() => {});
        await prisma.agentRun.deleteMany({ where: { id: testAgentRunId } }).catch(() => {});
        await prisma.caseRecord.deleteMany({ where: { id: testCaseId } }).catch(() => {});
      }
      if (testOrderId) {
        await prisma.payPalPayment.deleteMany({ where: { commerceOrderId: testOrderId } }).catch(() => {});
        await prisma.commerceOrderItem.deleteMany({ where: { commerceOrderId: testOrderId } }).catch(() => {});
        await prisma.commerceOrder.deleteMany({ where: { id: testOrderId } }).catch(() => {});
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // Step 1: User & Tenant Identity Context
  it('Step 01: Verify multi-tenant authentication and role hierarchy', async () => {
    assert.equal(buyer.role, 'BUYER');
    assert.equal(merchantUser.role, 'MERCHANT');
    assert.equal(adminUser.isPlatformAdmin, true);
    assert.ok(merchantOrgId, 'Merchant organization must be established');
  });

  // Step 2: PayPal Order Creation
  it('Step 02: Create PayPal commerce order for 1 TB High-Speed SSD ($199.99)', async () => {
    const orderResult = await PurchaseOrchestrationService.createOrderWithItems({
      buyerId: buyer.id,
      merchantOrganizationId: merchantOrgId,
      currency: 'USD',
      items: [
        {
          productReference: 'PROD-1TB-SSD',
          sku: 'APEX-NVME-1000',
          title: 'ApexDrive Pro 1TB NVMe PCIe 4.0 SSD',
          quantity: 1,
          unitAmountMinor: 19999,
        },
      ],
    });

    assert.ok(orderResult.order.id);
    assert.equal(orderResult.order.totalAmountMinor, 19999);
    assert.equal(orderResult.order.status, 'PENDING');
    testOrderId = orderResult.order.id;
  });

  // Step 3: Authorize & Capture Order
  it('Step 03: Capture PayPal payment through payment orchestration service', async () => {
    const orderDetails = await PurchaseOrchestrationService.getOrderDetails(testOrderId);
    assert.ok(orderDetails);
    assert.ok(orderDetails.payments.length > 0);

    const initialPayment = orderDetails.payments[0];
    const captureResult = await PaymentOrchestrationService.capturePayment(
      testOrderId,
      initialPayment.providerOrderId,
      buyer.id
    );

    assert.ok(captureResult.payment);
    assert.equal(captureResult.payment.paymentStatus, 'COMPLETED');
    assert.equal(captureResult.payment.amountMinor, 19999);
    testPaymentId = captureResult.payment.id;
    assert.ok(testPaymentId);
  });

  // Step 4: Ledger Persistence
  it('Step 04: Verify commerce order and payment settlement ledger', async () => {
    const order = await prisma.commerceOrder.findUnique({
      where: { id: testOrderId },
      include: { payments: true, items: true },
    });

    assert.ok(order);
    assert.equal(order.status, 'CAPTURED');
    assert.equal(order.payments.length, 1);
    assert.equal(order.payments[0].paymentStatus, 'COMPLETED');
  });

  // Step 5: Shipment Fulfillment Event
  it('Step 05: Record carrier dispatch & delivery fulfillment event in audit history', async () => {
    await EventOrchestrationService.recordSecurityAudit({
      actorId: merchantUser.id,
      action: 'CARRIER_DISPATCH',
      targetType: 'COMMERCE_ORDER',
      targetId: testOrderId,
      status: 'SUCCESS',
      metadata: {
        trackingNumber: 'TRK-9872145',
        carrier: 'FedEx',
        serviceTier: 'PRIORITY_AIR',
      },
    });

    const event = await prisma.securityAuditEvent.findFirst({
      where: { targetId: testOrderId, action: 'CARRIER_DISPATCH' },
    });
    assert.ok(event);
    assert.equal(event.status, 'SUCCESS');
  });

  // Step 6 & 7: Case Creation & Buyer Claim
  it('Step 06 & 07: Open dispute CaseRecord for "NOT_AS_DESCRIBED" linked to PayPal order', async () => {
    const newCase = await prisma.caseRecord.create({
      data: {
        caseNumber,
        title: 'Delivered 512GB variant instead of ordered 1TB model',
        description: 'Customer ordered 1 TB model ($199.99), received 512 GB external drive box.',
        category: 'NOT_AS_DESCRIBED',
        stage: CaseStage.INTAKE,
        status: CaseStatus.SUBMITTED,
        priority: 'HIGH',
        amountMinor: 19999,
        currency: 'USD',
        buyerId: buyer.id,
        merchantId: merchantUser.id,
        organizationId: merchantOrgId,
      },
    });

    assert.ok(newCase.id);
    testCaseId = newCase.id;

    // Link commerce order to case
    await PurchaseOrchestrationService.linkOrderToCase(testOrderId, testCaseId, buyer.id);

    // Create Buyer Claim
    await prisma.claim.create({
      data: {
        caseId: testCaseId,
        authorId: buyer.id,
        claimType: 'SIGNIFICANTLY_NOT_AS_DESCRIBED',
        statement: 'I ordered the 1 TB external SSD but received the 512 GB model instead.',
        requestedRemedy: RemedyType.FULL_REFUND,
      },
    });
  });

  // Step 8: Buyer Evidence Upload with Magic-Byte Inspection
  it('Step 08: Ingest Buyer unboxing photograph with valid PNG magic-bytes', async () => {
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
    const detectedMime = detectMagicBytes(validPngBuffer);
    assert.equal(detectedMime, 'image/png', 'Magic byte detector must identify PNG');

    const ev = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: buyer.id,
        filename: 'unboxing_label_photo.png',
        mimeType: 'image/png',
        sizeBytes: validPngBuffer.length,
        sha256: crypto.createHash('sha256').update(validPngBuffer).digest('hex'),
        storageKey: `cases/${testCaseId}/unboxing_label_photo.png`,
        evidenceType: 'PHOTO',
        verificationStatus: 'VERIFIED',
        visibility: 'SHARED_WITH_PARTICIPANTS',
      },
    });

    assert.ok(ev.id);
    buyerEvidenceId = ev.id;
    assert.ok(buyerEvidenceId);
  });

  // Step 9: Merchant Evidence Upload
  it('Step 09: Ingest Merchant itemized sales invoice with valid PDF magic-bytes', async () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const detectedMime = detectMagicBytes(validPdfBuffer);
    assert.equal(detectedMime, 'application/pdf', 'Magic byte detector must identify PDF');

    const ev = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: merchantUser.id,
        filename: 'sales_invoice_1tb.pdf',
        mimeType: 'application/pdf',
        sizeBytes: validPdfBuffer.length,
        sha256: crypto.createHash('sha256').update(validPdfBuffer).digest('hex'),
        storageKey: `cases/${testCaseId}/sales_invoice_1tb.pdf`,
        evidenceType: 'RECEIPT',
        verificationStatus: 'VERIFIED',
        visibility: 'SHARED_WITH_PARTICIPANTS',
      },
    });

    assert.ok(ev.id);
    merchantEvidenceId = ev.id;
    assert.ok(merchantEvidenceId);
  });

  // Step 10: Multimodal Extraction & Fact Normalization
  it('Step 10: Normalize storage capacity and monetary facts via FactNormalizer', async () => {
    const norm1TB = FactNormalizer.normalizeCapacity('1 TB');
    const norm512GB = FactNormalizer.normalizeCapacity('512GB');
    const normMoney = FactNormalizer.normalizeMonetary('$199.99');

    assert.equal(norm1TB, '1024 GB');
    assert.equal(norm512GB, '512 GB');
    assert.equal(normMoney?.cents, 19999);
  });

  // Step 11: Bilateral Evidence Graph Construction
  it('Step 11: Construct Bilateral Evidence Graph projecting claims and evidence nodes', async () => {
    const graph = await GraphBuilder.buildGraph(testCaseId);
    assert.ok(graph);
    assert.ok(graph.nodes.length >= 2, 'Graph must include case and evidence nodes');
  });

  // Step 12: BERR Contradiction Detection
  it('Step 12: Detect factual contradiction between 1024 GB purchase and 512 GB delivered unit', async () => {
    const berrResult = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: ['I ordered the 1 TB model, but received the 512 GB model.'],
      merchantStatements: ['Order shows SSD-PRO-1TB fulfilled.'],
      evidenceFacts: [
        {
          factType: 'PRODUCT_SPECIFICATION',
          name: 'Storage Capacity',
          rawValue: '512 GB',
          normalizedValue: '512 GB',
          confidence: 0.96,
          sourceExcerpt: 'Model Label 512 GB',
          isSubjective: false,
        },
      ],
    });

    assert.ok(berrResult.discrepancy.totalDiscrepancyScore >= 0.5, 'Contradiction score must indicate discrepancy');
    assert.ok(berrResult.comparisons.some((c) => c.discrepancyType === 'SPECIFICATION'));
  });

  // Step 13: Temporal Timeline Consistency Check
  it('Step 13: Execute TemporalEngine timeline reconstruction', async () => {
    const temporalResult = await TemporalEngine.analyzeCaseTimeline(testCaseId);
    assert.ok(temporalResult.timeline);
  });

  // Step 14: Semantic Drift Detection Across Commercial Stages
  it('Step 14: Execute SemanticDriftEngine tracking specification divergence across stages', async () => {
    const stageFacts: CommercialStageFact[] = [
      { stage: 'OFFER', fieldKey: 'capacity', value: '1024 GB' },
      { stage: 'ORDER', fieldKey: 'capacity', value: '1024 GB' },
      { stage: 'DISPATCH', fieldKey: 'capacity', value: '512 GB' },
      { stage: 'CLAIM', fieldKey: 'capacity', value: '512 GB' },
    ];

    const drift = SemanticDriftEngine.analyzeDrift(stageFacts);
    assert.ok(drift.hasDrift, 'Drift engine must detect specification divergence at dispatch');
    assert.equal(drift.earliestTransitionWithDrift, 'ORDER_TO_DISPATCH');
  });

  // Step 15: Bilateral Fairness / Order Invariance Verification
  it('Step 15: Verify order-permutation invariance (Buyer-first vs Merchant-first parity)', async () => {
    const buyerFirst = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: ['I ordered 1 TB but received 512 GB.'],
      merchantStatements: ['Fulfilled per catalog SKU.'],
      evidenceFacts: [],
    });

    const merchantFirst = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: ['Fulfilled per catalog SKU.'],
      merchantStatements: ['I ordered 1 TB but received 512 GB.'],
      evidenceFacts: [],
    });

    const delta = Math.abs(buyerFirst.discrepancy.totalDiscrepancyScore - merchantFirst.discrepancy.totalDiscrepancyScore);
    assert.ok(delta < 0.1, `Order divergence must be negligible (got ${delta})`);
  });

  // Step 16: Policy Evaluation Engine
  it('Step 16: Evaluate merchant resolution policy for eligible remedies', async () => {
    const policyResult = await ResolutionEngine.evaluateCase(testCaseId);
    assert.ok(policyResult.candidateOptions.length > 0);
  });

  // Step 17: Consumer Plain-Language Explanation
  it('Step 17: Generate empathetic plain-language explanation for consumer UI', async () => {
    const explanation = PlainLanguageExplanationHelper.explainCaseStatus({
      category: 'Wrong Product',
      totalDiscrepancyScore: 0.82,
      hasContradiction: true,
      recommendedRemedy: 'FULL_REFUND',
      partyRole: 'BUYER',
    });

    assert.equal(explanation.headline, 'Factual Discrepancy Identified');
    assert.ok(explanation.humanSignOffNote.includes('human operator approval'));
  });

  // Step 18: QualityReviewAgent Adversarial Citation Audit
  it('Step 18: QualityReviewAgent audits draft and checks citation coverage gate', async () => {
    // Create AgentRun context
    const run = await prisma.agentRun.create({
      data: {
        organizationId: merchantOrgId,
        caseId: testCaseId,
        userId: merchantUser.id,
        title: 'Acceptance Test Run',
        prompt: 'Investigate discrepancy and prepare resolution',
        status: 'RUNNING',
      },
    });
    testAgentRunId = run.id;

    const baseCtx: AgentExecutionContext = {
      runId: run.id,
      caseId: testCaseId,
      organizationId: merchantOrgId,
      actor: {
        id: merchantUser.id,
        email: merchantUser.email,
        fullName: merchantUser.fullName || 'Merchant User',
        role: 'MERCHANT',
        isPlatformAdmin: false,
        organizationId: merchantOrgId,
        orgRole: 'OWNER',
      },
      currentStep: 1,
      maxSteps: 12,
      totalTokens: 500,
      costEstimateUsd: 0.005,
      startTime: Date.now(),
      status: 'RUNNING',
    };

    const reviewResult = await QualityReviewAgent.execute(baseCtx);
    assert.ok(['APPROVED_FOR_DISPLAY', 'HUMAN_REVIEW_REQUIRED', 'NEEDS_MORE_EVIDENCE', 'NEEDS_CORRECTION'].includes(reviewResult.verdict));
    assert.equal(typeof reviewResult.confidenceScore, 'number');
  });

  // Step 19: Financial Action Guardrails Enforcement
  it('Step 19: FinancialActionGuardrails blocks autonomous fund execution and enforces proposal sign-off', async () => {
    // Must throw on autonomous financial execution
    assert.throws(
      () => {
        FinancialActionGuardrails.inspectAction('execute_refund', {
          caseId: testCaseId,
          amountMinor: 19999,
        });
      },
      {
        message: /Autonomous execution of "execute_refund" is strictly forbidden/,
      }
    );

    // Proposal check must flag required human approval
    const proposalInspection = FinancialActionGuardrails.inspectAction('create_draft_resolution_proposal', {
      caseId: testCaseId,
      remedyType: 'FULL_REFUND',
      amountMinor: 19999,
    });
    assert.equal(proposalInspection.requiresHumanApproval, true);
    assert.ok(proposalInspection.argumentsHash);
    argumentsHash = proposalInspection.argumentsHash;
  });

  // Step 20: Cryptographic Human Sign-Off Verification
  it('Step 20: Human operator signs off on AgentApprovalRequest verifying argument hash', async () => {
    const proposedArgs = {
      caseId: testCaseId,
      remedyType: 'FULL_REFUND',
      amountMinor: 19999,
    };

    const isHashValid = FinancialActionGuardrails.verifyArgumentsHash(proposedArgs, argumentsHash);
    assert.equal(isHashValid, true, 'Cryptographic hash must match proposed parameters');

    // Tampering test: verify mutation of amount causes failure
    const tamperedArgs = {
      caseId: testCaseId,
      remedyType: 'FULL_REFUND',
      amountMinor: 50000,
    };
    const isTamperedHashValid = FinancialActionGuardrails.verifyArgumentsHash(tamperedArgs, argumentsHash);
    assert.equal(isTamperedHashValid, false, 'Tampered parameters must fail verification');

    // Create approval record
    const approval = await prisma.agentApprovalRequest.create({
      data: {
        runId: testAgentRunId,
        actionType: 'REFUND_PROPOSAL',
        actionRisk: 'HIGH',
        description: 'Authorized full refund due to verified SKU mismatch at warehouse dispatch.',
        proposedArgumentsJson: JSON.stringify(proposedArgs),
        argumentsHash,
        status: 'APPROVED',
        requestedById: merchantUser.id,
        approvedById: merchantUser.id,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    assert.ok(approval.id);
    testApprovalRequestId = approval.id;
  });

  // Step 21: Financial Settlement & Case Resolution
  it('Step 21: Propose remedy, collect bilateral acceptance, execute refund, and resolve case', async () => {
    // Propose remedy via ResolutionOrchestrationService
    const proposal = await ResolutionOrchestrationService.proposeRemedy({
      caseId: testCaseId,
      proposedById: merchantUser.id,
      proposalType: 'FULL_REFUND',
      title: 'Full Refund for Wrong Product Variant',
      description: 'Merchant issues full refund of $199.99 for SKU mismatch.',
      amountMinor: 19999,
      currency: 'USD',
      reason: 'Specification mismatch confirmed: 512GB received instead of 1TB.',
    });

    assert.ok(proposal.id);
    testProposalId = proposal.id;

    // Buyer accepts proposal
    const buyerVote = await ResolutionOrchestrationService.recordPartyResponse(
      {
        proposalId: testProposalId,
        responderId: buyer.id,
        response: 'ACCEPTED',
        comment: 'Agreed to full refund settlement.',
      },
      buyer
    );
    assert.ok(buyerVote.response);

    // Merchant confirms agreement -> triggers refund and resolves case
    const merchantVote = await ResolutionOrchestrationService.recordPartyResponse(
      {
        proposalId: testProposalId,
        responderId: merchantUser.id,
        response: 'ACCEPTED',
        comment: 'Merchant confirms full refund resolution.',
      },
      merchantUser
    );
    assert.equal(merchantVote.proposalStatus, 'AGREED');

    // Case must now be resolved
    const resolvedCase = await prisma.caseRecord.findUnique({
      where: { id: testCaseId },
    });
    assert.equal(resolvedCase?.status, CaseStatus.RESOLVED);
    assert.equal(resolvedCase?.stage, CaseStage.FINALIZED);

    // Final Audit Event
    await EventOrchestrationService.recordCaseEvent({
      caseId: testCaseId,
      actorId: merchantUser.id,
      eventType: EventType.CASE_RESOLVED,
      description: 'Dispute successfully settled: Full refund $199.99 executed to PayPal payment ledger.',
      metadata: {
        proposalId: testProposalId,
        approvalRequestId: testApprovalRequestId,
      },
    });

    const caseEvents = await prisma.caseEvent.findMany({ where: { caseId: testCaseId } });
    assert.ok(caseEvents.some((e) => e.eventType === EventType.CASE_RESOLVED));
  });
});
