import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@/lib/prisma';
import {
  CaseCategory,
  CaseStage,
  CaseStatus,
  EvidenceSource,
  EvidenceType,
  EvidenceVisibility,
  MalwareScanStatus,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/client';
import {
  SellerPortalAccessError,
  SellerResponseService,
  SellerWorkflowOrchestrator,
} from '@/server/seller';
import { GraphBuilder } from '@/server/graph/graph-builder';
import { BerrV2Service } from '@/server/ai/reasoning/berr-v2.service';
import { BuyerTrackingService } from '@/server/services/buyer-tracking.service';
import { EvidenceStorageError } from '@/server/storage/evidence-storage';
import type { AuthenticatedUser } from '@/server/auth/session';

function toSessionUser(u: {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isPlatformAdmin: boolean;
  organization: string | null;
}): AuthenticatedUser {
  return {
    id: u.id,
    email: u.email,
    name: u.fullName,
    fullName: u.fullName,
    role: u.role,
    isPlatformAdmin: u.isPlatformAdmin,
    isActive: true,
    avatarUrl: null,
    organization: u.organization,
    orgMemberships: [],
  };
}

function makePdfBuffer(textContent: string): Buffer {
  return Buffer.from(`%PDF-1.4\n1 0 obj <<>> endobj\nBT (${textContent}) Tj ET\n%%EOF`, 'utf8');
}

test('End-to-end Seller Response: strict org isolation, PII stripping, VIEWED audit, verification, BEG/BERR, and follow-ups', async () => {
  const suffix = Date.now();
  const [buyerRow, techMerchantRow, digitalMerchantRow, adminRow] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } }),
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_techstore_merchant' } }),
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_digitalmart_merchant' } }),
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } }),
  ]);

  const buyerUser = toSessionUser(buyerRow);
  const techMerchant = toSessionUser(techMerchantRow);
  const otherMerchant = toSessionUser(digitalMerchantRow);
  const adminUser = toSessionUser(adminRow);

  const testCase = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-E2E-${suffix}`,
      title: 'Wrong Variant Delivered E2E',
      description:
        'Order ID: ORD-E2E-556677. Buyer phone 9876543210 email secret.buyer@example.com PIN 560001 India.',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 649900,
      currency: 'INR',
      buyerId: buyerRow.id,
      merchantId: adminRow.id,
      organizationId: null,
    },
  });

  const buyerPublicEv = await prisma.evidence.create({
    data: {
      caseId: testCase.id,
      uploadedById: buyerRow.id,
      filename: 'buyer-invoice-e2e.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1200,
      storageKey: 'unused.pdf',
      sha256: `e2e-pub-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });

  const buyerPrivateEv = await prisma.evidence.create({
    data: {
      caseId: testCase.id,
      uploadedById: buyerRow.id,
      filename: 'private-bank-statement.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1200,
      storageKey: 'unused-priv.pdf',
      sha256: `e2e-priv-${suffix}`,
      evidenceType: EvidenceType.OTHER,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.BUYER_ONLY,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });

  await prisma.evidenceAnalysisResult.createMany({
    data: [
      {
        evidenceId: buyerPublicEv.id,
        assessmentState: 'REQUIRES_REVIEW',
        confidence: 0.9,
        findingsSummary: 'Clean invoice',
        humanReviewRecommended: false,
        analysisMethod: 'TEST',
      },
      {
        evidenceId: buyerPrivateEv.id,
        assessmentState: 'REQUIRES_REVIEW',
        confidence: 0.9,
        findingsSummary: 'Clean statement',
        humanReviewRecommended: false,
        analysisMethod: 'TEST',
      },
    ],
  });

  const createdStorageKeys: string[] = [];

  try {
    // 1. Run Screening -> Extraction -> TechStore Match -> Portal Dispatch
    const wf = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: testCase.id,
      actorId: buyerRow.id,
      marketplaceHint: 'DIRECT',
      orderIdHint: 'ORD-E2E-556677',
      productNameHint: 'Portable SSD 1 TB',
      idempotencyKey: `e2e-idem-${suffix}`,
      inMemoryDocuments: [
        {
          evidenceId: buyerPublicEv.id,
          filename: buyerPublicEv.filename,
          mimeType: 'application/pdf',
          rawText:
            'Sold By: TechStore Retail Private Limited\nSeller GSTIN: 29AABCT1234E1Z5\nOrder ID: ORD-E2E-556677',
        },
      ],
    });

    const requestId = wf.gatewayResult?.requestId;
    assert.ok(requestId, 'Expected dispatched SellerEvidenceRequest');

    // 2. Security checks: buyer forbidden, unrelated merchant (DigitalMart) forbidden
    await assert.rejects(
      () => SellerResponseService.listRequestsForUser(buyerUser),
      (err: unknown) => err instanceof SellerPortalAccessError && err.status === 403
    );

    const digitalRequests = await SellerResponseService.listRequestsForUser(otherMerchant);
    assert.equal(
      digitalRequests.some((r) => r.id === requestId),
      false,
      'DigitalMart merchant must never see TechStore evidence request'
    );

    await assert.rejects(
      () => SellerResponseService.getRequestDetailForUser(requestId, otherMerchant),
      (err: unknown) => err instanceof SellerPortalAccessError && err.status === 403
    );

    // 3. Authorized TechStore merchant views request -> transitions to VIEWED & strips Buyer PII + BUYER_ONLY files
    const techRequests = await SellerResponseService.listRequestsForUser(techMerchant);
    assert.equal(techRequests.some((r) => r.id === requestId), true);

    const detail = await SellerResponseService.getRequestDetailForUser(requestId, techMerchant);
    assert.equal(detail.status, 'VIEWED');
    assert.ok(detail.orderDetails.viewedAt);
    assert.equal(detail.customerComplaint.issueSummary.includes('secret.buyer@example.com'), false);
    assert.equal(
      detail.customerComplaint.sharedBuyerEvidence.some((e) => e.id === buyerPrivateEv.id),
      false,
      'BUYER_ONLY evidence must be hidden from merchant portal'
    );

    // 4. Reject disguised invalid file upload via EvidenceStorage validation
    await assert.rejects(
      () =>
        SellerResponseService.submitSellerResponse({
          requestId,
          user: techMerchant,
          stance: 'DISAGREE',
          summary: 'Dispatched correct SKU per warehouse scan',
          declarationConfirmed: true,
          itemResponses: [{ key: 'product_sku_info', status: 'PROVIDED', note: 'SKU-SSD-1TB' }],
          files: [
            {
              buffer: Buffer.from('<html>not a pdf</html>'),
              filename: 'fake.pdf',
              mimeType: 'application/pdf',
            },
          ],
        }),
      (err: unknown) => err instanceof EvidenceStorageError && err.status === 400
    );

    // 5. Submit genuine Seller Response with non-coercive NOT_AVAILABLE + valid PDF artifact (idempotent!)
    const respPdf = makePdfBuffer(
      'Packing Slip Order ORD-E2E-556677 Portable SSD 1 TB Amount 6499.00 Date 2026-10-01'
    );
    const submitOut = await SellerResponseService.submitSellerResponse({
      requestId,
      user: techMerchant,
      stance: 'DISAGREE',
      summary: 'Packed exact 1TB SSD SKU with matching warehouse weight log.',
      additionalRemarks: 'Carrier weighment certificate requested from depot.',
      declarationConfirmed: true,
      idempotencyKey: `resp-idem-${suffix}`,
      itemResponses: [
        { key: 'product_sku_info', status: 'PROVIDED', note: 'SKU-TS-SSD1TB' },
        { key: 'packing_declaration', status: 'PROVIDED', note: 'Confirmed at bench #2' },
        {
          key: 'picking_packing_records',
          status: 'NOT_AVAILABLE',
          note: 'Legacy handheld log archived',
        },
      ],
      files: [
        {
          buffer: respPdf,
          filename: 'warehouse-packing-slip.pdf',
          mimeType: 'application/pdf',
          requestedItemKey: 'product_sku_info',
          evidenceType: 'INVOICE',
        },
      ],
    });

    assert.equal(submitOut.idempotentReplay, false);
    assert.equal(submitOut.uploadedEvidenceIds.length, 1);
    assert.ok(submitOut.breakdowns && submitOut.breakdowns.length > 0);
    assert.equal(submitOut.breakdowns[0].informationConsistency.orderIdMatched, true);
    assert.equal(submitOut.breakdowns[0].fileUsability.usable, true);

    const savedEvRows = await prisma.evidence.findMany({
      where: { id: { in: submitOut.uploadedEvidenceIds } },
      select: { storageKey: true, sourceType: true },
    });
    for (const r of savedEvRows) {
      createdStorageKeys.push(r.storageKey);
      assert.equal(r.sourceType, EvidenceSource.MERCHANT_PORTAL);
    }

    // Idempotent replay produces no duplicate uploads
    const replayOut = await SellerResponseService.submitSellerResponse({
      requestId,
      user: techMerchant,
      stance: 'DISAGREE',
      summary: 'Duplicate retry',
      declarationConfirmed: true,
      idempotencyKey: `resp-idem-${suffix}`,
      itemResponses: [],
    });
    assert.equal(replayOut.idempotentReplay, true);
    assert.equal(replayOut.responseId, submitOut.responseId);

    // 6. Verify BEG Graph includes seller identity, request, communication, response nodes & provenance edges
    const graph = await GraphBuilder.buildGraph(testCase.id);
    assert.ok(graph.nodes.some((n) => n.type === 'SELLER_IDENTITY'));
    assert.ok(graph.nodes.some((n) => n.type === 'SELLER_EVIDENCE_REQUEST'));
    assert.ok(graph.nodes.some((n) => n.type === 'SELLER_RESPONSE'));
    assert.ok(graph.nodes.some((n) => n.type === 'COMMUNICATION_EVENT'));
    assert.ok(graph.edges.some((e) => e.type === 'IDENTIFIES_SELLER'));
    assert.ok(
      graph.edges.some((e) => e.type === 'RESPONDS_TO_REQUEST' && e.provenance === 'MERCHANT_SUBMITTED')
    );

    // 7. Verify BERR v2 classifies seller identity & seller response facts
    const berr = await BerrV2Service.evaluateCase(testCase.id);
    assert.ok(berr.classifiedFacts.some((f) => f.field === 'seller_identity_attribution'));
    assert.ok(berr.classifiedFacts.some((f) => f.field === 'seller_response_stance'));

    // 8. Verify BuyerTrackingService reflects completed Stage 3 + sellerOutreach safely
    const buyerDetail = await BuyerTrackingService.getBuyerComplaintDetail(
      buyerUser,
      testCase.caseNumber
    );
    assert.ok(buyerDetail);
    assert.equal(buyerDetail.sellerOutreach?.channel, 'SELLER_PORTAL');
    assert.equal(buyerDetail.sellerOutreach?.requestStatus, 'SELLER_RESPONDED');
    const stage3 = buyerDetail.timeline.find((t) => t.stageKey === 'SELLER_EVIDENCE');
    assert.equal(stage3?.status, 'COMPLETED');

    // 9. Investigator follow-up + NO_RESPONSE transitions work properly
    const followedUp = await SellerResponseService.issueFollowUp({
      requestId,
      actor: adminUser,
      message: 'Please attach serial number photo.',
      extendHours: 24,
    });
    assert.equal(followedUp.followUpCount, 1);

    const noResp = await SellerResponseService.markNoResponse({
      requestId,
      actor: adminUser,
      reason: 'Window expired after follow-up',
    });
    assert.equal(noResp.status, 'NO_RESPONSE');
  } finally {
    await prisma.caseRecord.deleteMany({ where: { id: testCase.id } });
    for (const sk of createdStorageKeys) {
      const fullPath = path.isAbsolute(sk)
        ? sk
        : path.resolve(process.cwd(), process.env.EVIDENCE_STORAGE_DIR || './.private/evidence', sk);
      await fs.unlink(fullPath).catch(() => {});
    }
  }
});
