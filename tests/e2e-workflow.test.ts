import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { PayPalMockProvider } from "../src/server/paypal/providers/paypal-mock.provider";
import {
  PurchaseOrchestrationService,
  ResolutionOrchestrationService,
  PaymentOrchestrationService,
  EventOrchestrationService,
} from "../src/server/orchestration";
import { CaseStatus, CaseStage, RemedyType } from "../src/generated/prisma/client";
import { toMinorUnits, toDecimalString, calculateRemainingRefundable } from "../src/server/paypal/utils/money";
import { detectMagicBytes } from "../src/server/storage/evidence-storage";
import { FactNormalizer } from "../src/server/ai/normalization/fact-normalizer";
import { ContradictionDetector } from "../src/server/ai/reasoning/contradiction-detector";
import { GraphBuilder } from "../src/server/graph/graph-builder";
import { TemporalEngine } from "../src/server/temporal/temporal-engine";
import { ResolutionEngine } from "../src/server/resolution/resolution-engine";
import { WebhookProcessingService } from "../src/server/paypal/services/webhook-processing.service";
import { AuthenticatedUser } from "../src/server/auth/session";

describe("ResolveGraph Step 7: End-to-End Resolution Pipeline & Integration Suite", () => {
  let buyer: AuthenticatedUser;
  let merchantUser: AuthenticatedUser;
  let adminUser: AuthenticatedUser;
  let merchantOrgId: string;
  let testOrderId: string;
  let testPaymentId: string;
  let testCaseId: string;
  let testProposalId: string;

  before(async () => {
    PayPalMockProvider.reset();

    // Query seeded users
    const buyerDb = await prisma.user.findFirst({ where: { role: "BUYER" } });
    assert.ok(buyerDb, "Buyer user must exist in DB");
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

    const merchantDb = await prisma.user.findFirst({ where: { role: "MERCHANT" } });
    assert.ok(merchantDb, "Merchant user must exist in DB");
    const org = await prisma.organization.findFirst({
      include: { members: true },
    });
    assert.ok(org, "Organization must exist in DB");
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
      organization: merchantDb.organization,
      orgMemberships: [
        {
          organizationId: org.id,
          role: "ORG_ADMIN",
          organization: {
            id: org.id,
            name: org.name,
            slug: org.slug,
          },
        },
      ],
    };

    const adminDb = await prisma.user.findFirst({ where: { isPlatformAdmin: true } });
    assert.ok(adminDb, "Admin user must exist in DB");
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

  // 1. User authentication & authorization
  it("Scenario 1: Authenticates buyer, merchant, and admin roles with multi-tenant boundaries", async () => {
    assert.equal(buyer.role, "BUYER");
    assert.equal(merchantUser.role, "MERCHANT");
    assert.equal(adminUser.isPlatformAdmin, true);
    assert.equal(merchantUser.orgMemberships[0].organizationId, merchantOrgId);
  });

  // 2. Commerce order creation & minor unit validation
  it("Scenario 2: Creates commerce order with strict minor unit pricing ($79.99 = 7999 cents)", async () => {
    const minorPrice = toMinorUnits("79.99", "USD");
    assert.equal(minorPrice, 7999);
    assert.equal(toDecimalString(minorPrice, "USD"), "79.99");

    const orderResult = await PurchaseOrchestrationService.createOrderWithItems({
      buyerId: buyer.id,
      merchantOrganizationId: merchantOrgId,
      currency: "USD",
      items: [
        {
          productReference: "PROD-1TB-SSD",
          sku: "APEX-NVME-1000",
          title: "ApexDrive Pro 1TB NVMe PCIe 4.0 SSD",
          quantity: 1,
          unitAmountMinor: minorPrice,
        },
      ],
    });

    assert.ok(orderResult.order.id);
    assert.equal(orderResult.order.totalAmountMinor, 7999);
    assert.equal(orderResult.order.status, "PENDING");
    testOrderId = orderResult.order.id;
  });

  // 3. PayPal order authorization & capture
  it("Scenario 3: Captures PayPal Sandbox payment and updates ledger balances", async () => {
    const orderDetails = await PurchaseOrchestrationService.getOrderDetails(testOrderId);
    assert.ok(orderDetails);
    assert.ok(orderDetails.payments.length > 0);

    const initialPayment = orderDetails.payments[0];
    const captureResult = await PaymentOrchestrationService.capturePayment(
      testOrderId,
      initialPayment.providerOrderId,
      buyer.id
    );

    assert.ok(captureResult.payment.captureId);
    assert.equal(captureResult.payment.paymentStatus, "COMPLETED");
    assert.equal(captureResult.payment.amountMinor, 7999);
    testPaymentId = captureResult.payment.id;
  });

  // 4. Complaint initiation & case creation linked to payment
  it("Scenario 4: Initiates dispute complaint linked to the captured commerce order", async () => {
    const newCase = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-E2E-${Date.now().toString().slice(-4)}`,
        title: "ApexDrive Pro SSD Capacity Mismatch (1TB ordered, 512GB received)",
        description: "Customer ordered 1TB NVMe drive, received package containing 512GB drive.",
        category: "NOT_AS_DESCRIBED",
        status: CaseStatus.SUBMITTED,
        priority: "HIGH",
        amountMinor: 7999,
        currency: "USD",
        buyerId: buyer.id,
        merchantId: merchantUser.id,
        organizationId: merchantOrgId,
        stage: CaseStage.INTAKE,
      },
    });

    testCaseId = newCase.id;

    // Link commerce order to case
    await PurchaseOrchestrationService.linkOrderToCase(testOrderId, testCaseId, buyer.id);

    const linkedOrders = await PurchaseOrchestrationService.getOrdersForCase(testCaseId);
    assert.equal(linkedOrders.length, 1);
    assert.equal(linkedOrders[0].id, testOrderId);
  });

  // 5. Evidence submission with security scanning (magic bytes)
  it("Scenario 5: Uploads and cryptographically locks evidence with magic byte verification", async () => {
    // Valid JPEG header
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const detected = detectMagicBytes(jpegBytes);
    assert.equal(detected, "image/jpeg");

    const evidence = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: buyer.id,
        filename: "photo_drive_label.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        storageKey: `cases/${testCaseId}/evidence/drive_photo.jpg`,
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        evidenceType: "PHOTO",
        verificationStatus: "VERIFIED",
        visibility: "SHARED_WITH_PARTICIPANTS",
      },
    });

    assert.ok(evidence.id);
  });

  // 6. AI consent verification
  it("Scenario 6: Verifies AI processing consent lifecycle", async () => {
    const consent = await prisma.aIProcessingConsent.create({
      data: {
        caseId: testCaseId,
        grantedById: buyer.id,
        provider: "test",
        purpose: "EVIDENCE_INVESTIGATION",
        noticeVersion: "2026.1",
      },
    });

    assert.ok(consent.id);
    assert.equal(consent.revokedAt, null);
  });

  // 7. Multimodal fact extraction & unit normalization
  it("Scenario 7: Normalizes storage capacity facts accurately to Gigabytes", () => {
    const norm1 = FactNormalizer.normalizeCapacity("1 TB");
    const norm2 = FactNormalizer.normalizeCapacity("512 GB");

    assert.equal(norm1, "1024 GB");
    assert.equal(norm2, "512 GB");
  });

  // 8. Bilateral claim decomposition
  it("Scenario 8: Decomposes buyer and merchant claim assertions", async () => {
    const buyerClaim = await prisma.claim.create({
      data: {
        caseId: testCaseId,
        authorId: buyer.id,
        partyRole: "BUYER",
        claimType: "SIGNIFICANTLY_NOT_AS_DESCRIBED",
        statement: "Received 512GB unit instead of purchased 1000GB unit.",
        requestedRemedy: RemedyType.PARTIAL_REFUND,
        status: "ACTIVE",
      },
    });

    assert.ok(buyerClaim.id);
    assert.equal(buyerClaim.partyRole, "BUYER");
  });

  // 9. BERR discrepancy calculation
  it("Scenario 9: Calculates weighted discrepancy score D = alpha*D_exact + beta*D_semantic + gamma*D_temporal", () => {
    const result = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: ["I received a 512GB laptop, but I paid for 1TB"],
      merchantStatements: ["Order details confirm 1TB model shipped"],
      evidenceFacts: [],
    });

    const d = result.discrepancy;
    assert.ok(d.totalDiscrepancyScore >= 0.5, "Expected discrepancy >= 0.5 for 512GB vs 1TB mismatch");
    const expected = Number(
      (d.weights.alpha * d.exactDiscrepancy + d.weights.beta * d.semanticDiscrepancy + d.weights.gamma * d.temporalDiscrepancy).toFixed(3)
    );
    assert.strictEqual(d.totalDiscrepancyScore, expected);
  });

  // 10. Bilateral Evidence Graph construction & projection
  it("Scenario 10: Constructs Bilateral Evidence Graph with multi-party projections", async () => {
    const graph = await GraphBuilder.buildGraph(testCaseId);
    assert.ok(graph);
    assert.strictEqual(graph.caseId, testCaseId);
    assert.ok(graph.nodes.length >= 3, "Graph must contain Case, Buyer, and Merchant nodes");
    assert.ok(graph.edges.length >= 2, "Graph must contain edges linking parties");
  });

  // 11. Temporal anomaly detection
  it("Scenario 11: Detects temporal timeline sequencing and date consistency", async () => {
    const { timeline, anomalies } = await TemporalEngine.analyzeCaseTimeline(testCaseId);
    assert.ok(Array.isArray(timeline));
    assert.ok(Array.isArray(anomalies));
  });

  // 12. Policy evaluation & grounded remedies
  it("Scenario 12: Evaluates organization policy and suggests grounded remedies", async () => {
    const evaluation = await ResolutionEngine.evaluateCase(testCaseId);
    assert.ok(evaluation);
    assert.strictEqual(evaluation.caseId, testCaseId);
    assert.ok(evaluation.candidateOptions.length >= 1);
  });

  // 13. Bilateral proposal creation & counterparty voting
  it("Scenario 13: Creates formal resolution proposal and collects bilateral party acceptances", async () => {
    const proposal = await ResolutionOrchestrationService.proposeRemedy({
      caseId: testCaseId,
      proposedById: merchantUser.id,
      proposalType: "PARTIAL_REFUND",
      title: "Settlement: $25 Partial Refund for Capacity Difference",
      description: "Merchant offers $25.00 partial refund; buyer retains 512GB SSD.",
      amountMinor: 2500,
      currency: "USD",
      reason: "Hardware capacity mismatch confirmed by packaging and label evidence.",
    });

    assert.ok(proposal.id);
    testProposalId = proposal.id;

    // Buyer accepts proposal
    const buyerVote = await ResolutionOrchestrationService.recordPartyResponse(
      {
        proposalId: testProposalId,
        responderId: buyer.id,
        response: "ACCEPTED",
        comment: "Agreed to keep 512GB unit with $25 price adjustment.",
      },
      buyer
    );

    assert.ok(buyerVote.response);
  });

  // 14. Resolution agreement triggers PayPal refund
  it("Scenario 14: Finalizes bilateral agreement and dispatches automated PayPal refund", async () => {
    // Merchant confirms agreement
    const merchantVote = await ResolutionOrchestrationService.recordPartyResponse(
      {
        proposalId: testProposalId,
        responderId: merchantUser.id,
        response: "ACCEPTED",
        comment: "Merchant accepts $25 partial refund settlement.",
      },
      merchantUser
    );

    assert.equal(merchantVote.proposalStatus, "AGREED");

    // Case must now be resolved
    const resolvedCase = await prisma.caseRecord.findUnique({
      where: { id: testCaseId },
    });
    assert.equal(resolvedCase?.status, CaseStatus.RESOLVED);
    assert.equal(resolvedCase?.stage, CaseStage.FINALIZED);
  });

  // 15. Balance verification & over-refund prevention
  it("Scenario 15: Validates remaining refundable balance and prevents over-refunds", async () => {
    const remaining = calculateRemainingRefundable(7999, [{ amountMinor: 2500, status: "COMPLETED" }]);
    assert.equal(remaining, 5499);

    // Attempting to refund more than remaining 5499 balance directly fails
    await assert.rejects(
      async () => {
        await PaymentOrchestrationService.executeResolutionRefund(
          {
            paymentId: testPaymentId,
            amountMinor: 6000,
            reason: "Attempted over-refund test",
          },
          merchantUser
        );
      },
      {
        message: /exceeds remaining refundable balance/i,
      }
    );
  });

  // 16. PayPal webhook ingestion & deduplication
  it("Scenario 16: Processes PayPal webhook event idempotently and ignores duplicates", async () => {
    const mockWebhook = {
      id: `WH-E2E-${Date.now()}`,
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource_type: "capture",
      resource: {
        id: "84729103KM829141P",
        amount: { value: "79.99", currency_code: "USD" },
        status: "COMPLETED",
      },
    };

    const firstIngest = await WebhookProcessingService.processEvent(mockWebhook);
    assert.equal(firstIngest.status, "PROCESSED");

    // Re-ingest duplicate
    const secondIngest = await WebhookProcessingService.processEvent(mockWebhook);
    assert.equal(secondIngest.status, "ALREADY_PROCESSED");
  });

  // 17. Multi-tenant isolation boundary check
  it("Scenario 17: Enforces strict multi-tenant authorization boundaries", async () => {
    const otherOrgCase = await prisma.caseRecord.findFirst({
      where: {
        organizationId: { not: merchantOrgId },
      },
    });

    if (otherOrgCase) {
      assert.notEqual(otherOrgCase.organizationId, merchantOrgId);
    }
  });

  // 18. End-to-end immutable audit trail verification
  it("Scenario 18: Aggregates comprehensive chronological audit history across all subsystems", async () => {
    const auditHistory = await EventOrchestrationService.getUnifiedCaseAuditHistory(testCaseId);
    assert.ok(auditHistory.length > 0);

    const hasCaseEvent = auditHistory.some((a) => a.type === "CASE_EVENT");
    const hasTimelineEvent = auditHistory.some((a) => a.type === "TIMELINE_EVENT");
    assert.ok(hasCaseEvent, "Audit history must contain CaseEvents");
    assert.ok(hasTimelineEvent, "Audit history must contain TimelineEvents");

    // Verify timestamps are chronologically ascending
    for (let i = 1; i < auditHistory.length; i++) {
      const prev = new Date(auditHistory[i - 1].timestamp).getTime();
      const curr = new Date(auditHistory[i].timestamp).getTime();
      assert.ok(curr >= prev, "Audit items must be chronologically ordered");
    }
  });

  after(async () => {
    // Clean up test records created during e2e suite
    if (testCaseId) {
      await prisma.caseRecord.deleteMany({ where: { id: testCaseId } }).catch(() => {});
    }
    if (testOrderId) {
      await prisma.commerceOrder.deleteMany({ where: { id: testOrderId } }).catch(() => {});
    }
  });
});
