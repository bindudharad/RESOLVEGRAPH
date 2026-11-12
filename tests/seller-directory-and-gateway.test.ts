import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '@/lib/prisma';
import {
  CaseCategory,
  CaseStage,
  CaseStatus,
  EvidenceSource,
  EvidenceType,
  EvidenceVisibility,
  MalwareScanStatus,
  VerificationStatus,
} from '@/generated/prisma/client';
import {
  SellerCommunicationGatewayService,
  SellerDirectoryService,
  SellerWorkflowOrchestrator,
} from '@/server/seller';

test('Priority directory matching distinguishes GSTIN, storefront ID, strict name, and fuzzy candidate safety', async () => {
  const suffix = Date.now();
  const fuzzyOrgName = `Fuzzy Guard Merch ${suffix} Pvt Ltd`;
  const created = await SellerDirectoryService.registerOrUpdateSeller({
    legalName: fuzzyOrgName,
    gstin: `29FUZZY${String(suffix).slice(-4)}E1Z5`.slice(0, 15).padEnd(15, 'Z'),
    state: 'Karnataka',
    identityStatus: 'REGISTERED',
    registrationStatus: 'REGISTERED',
    verificationStatus: 'VERIFIED',
    linkedOrganizationId: 'org_techstore',
    linkedMerchantUserId: 'usr_techstore_merchant',
    marketplaceAccount: {
      marketplace: 'AMAZON',
      marketplaceSellerId: `MKT_ID_${suffix}`,
      storefrontName: `FuzzyStore ${suffix}`,
      isVerified: true,
    },
  });

  try {
    // 1. Priority 1: Exact GSTIN match against registered seller -> REGISTERED_VERIFIED
    const gstinMatch = await SellerDirectoryService.matchAndResolveSeller(
      {
        legalName: fuzzyOrgName,
        displayName: fuzzyOrgName,
        gstin: created.gstin,
        panMasked: null,
        panHash: null,
        businessAddress: null,
        state: 'Karnataka',
        marketplace: 'AMAZON',
        marketplaceSellerId: null,
        orderId: `ORD-GST-${suffix}`,
        invoiceNumber: null,
        productName: 'Test Hardware',
        sellerRelationship: 'MARKETPLACE_THIRD_PARTY_SELLER',
        sourceDocumentId: null,
        pageNumber: 1,
        sourceExcerpt: null,
        detectedEntities: [],
        isAmbiguous: false,
        ambiguityReasons: [],
        confidence: 0.96,
        extractionMethod: 'DETERMINISTIC_LAYOUT_OCR',
      },
      { autoCreateUnregistered: false }
    );
    assert.equal(gstinMatch.matchOutcome, 'VERIFIED_MATCH');
    assert.equal(gstinMatch.registration.registrationStatus, 'REGISTERED_VERIFIED');
    assert.equal(gstinMatch.registration.organizationId, 'org_techstore');

    // 2. Priority 2: Exact marketplace + marketplaceSellerId match (without GSTIN)
    const mktMatch = await SellerDirectoryService.matchAndResolveSeller(
      {
        legalName: null,
        displayName: null,
        gstin: null,
        panMasked: null,
        panHash: null,
        businessAddress: null,
        state: null,
        marketplace: 'AMAZON',
        marketplaceSellerId: `MKT_ID_${suffix}`,
        orderId: `ORD-MKT-${suffix}`,
        invoiceNumber: null,
        productName: 'Test Hardware',
        sellerRelationship: 'MARKETPLACE_THIRD_PARTY_SELLER',
        sourceDocumentId: null,
        pageNumber: 1,
        sourceExcerpt: null,
        detectedEntities: [],
        isAmbiguous: false,
        ambiguityReasons: [],
        confidence: 0.85,
        extractionMethod: 'DETERMINISTIC_LAYOUT_OCR',
      },
      { autoCreateUnregistered: false }
    );
    assert.equal(mktMatch.matchOutcome, 'VERIFIED_MATCH');
    assert.equal(mktMatch.sellerEntry?.id, created.id);

    // 3. Fuzzy / partial similarity NEVER grants portal access automatically
    const fuzzyOnly = await SellerDirectoryService.matchAndResolveSeller(
      {
        legalName: `Fuzzy Guard Merch ${suffix}`, // missing Pvt Ltd & GSTIN
        displayName: `Fuzzy Guard Merch ${suffix}`,
        gstin: null,
        panMasked: null,
        panHash: null,
        businessAddress: null,
        state: null,
        marketplace: 'AMAZON',
        marketplaceSellerId: null,
        orderId: `ORD-FUZ-${suffix}`,
        invoiceNumber: null,
        productName: 'Test Hardware',
        sellerRelationship: 'MARKETPLACE_THIRD_PARTY_SELLER',
        sourceDocumentId: null,
        pageNumber: 1,
        sourceExcerpt: null,
        detectedEntities: [],
        isAmbiguous: false,
        ambiguityReasons: [],
        confidence: 0.72,
        extractionMethod: 'DETERMINISTIC_LAYOUT_OCR',
      },
      { autoCreateUnregistered: false }
    );
    assert.notEqual(fuzzyOnly.matchOutcome, 'VERIFIED_MATCH');
    assert.notEqual(fuzzyOnly.registration.registrationStatus, 'REGISTERED_VERIFIED');
    assert.equal(fuzzyOnly.requiresHumanReview, true);
  } finally {
    await prisma.sellerDirectoryEntry.delete({ where: { id: created.id } }).catch(() => {});
  }
});

test('Scenario A (Registered Seller) vs Scenario B (Unregistered Seller Help Centre Fallback) + Scenario C review', async () => {
  const suffix = Date.now();
  const buyer = await prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } });

  // Scenario A Case: TechStore Retail Private Limited (GSTIN 29AABCT1234E1Z5 from dev.db sync)
  const caseReg = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-REG-${suffix}`,
      title: 'Scenario A TechStore Wrong Unit',
      description: 'Order ID: ORD-TS-778899 on Direct',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 649900,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
      organizationId: null,
    },
  });
  const evReg = await prisma.evidence.create({
    data: {
      caseId: caseReg.id,
      uploadedById: buyer.id,
      filename: 'techstore-inv.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1000,
      storageKey: 'unused-in-memory.pdf',
      sha256: `ts-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });
  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: evReg.id,
      assessmentState: 'REQUIRES_REVIEW',
      confidence: 0.9,
      findingsSummary: 'Clean file',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  // Scenario B Case: Suri Consumer Private Limited (29ABDCS9580N1ZD) unregistered Flipkart seller
  const caseUnreg = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-UNREG-${suffix}`,
      title: 'Scenario B Flipkart Unregistered Seller',
      description: 'Order ID: OD438897692023711100 on Flipkart',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 299900,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
      organizationId: null,
    },
  });
  const evUnreg = await prisma.evidence.create({
    data: {
      caseId: caseUnreg.id,
      uploadedById: buyer.id,
      filename: 'flipkart-suri-invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1200,
      storageKey: 'unused-in-memory-fk.pdf',
      sha256: `fk-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });
  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: evUnreg.id,
      assessmentState: 'REQUIRES_REVIEW',
      confidence: 0.9,
      findingsSummary: 'Clean file',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  // Scenario C Case: Ambiguous / unreadable document -> REVIEW_REQUIRED
  const caseAmb = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-AMB-${suffix}`,
      title: 'Scenario C Ambiguous Seller Document',
      description: 'Order ID: ORD-AMB-11',
      category: CaseCategory.OTHER,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 120000,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
      organizationId: null,
    },
  });
  const evAmb = await prisma.evidence.create({
    data: {
      caseId: caseAmb.id,
      uploadedById: buyer.id,
      filename: 'blurry-slip.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 900,
      storageKey: 'unused-amb.pdf',
      sha256: `amb-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });
  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: evAmb.id,
      assessmentState: 'REQUIRES_REVIEW',
      confidence: 0.8,
      findingsSummary: 'Blurry slip clean',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  const unregGstin = `29ABDCS${String(suffix).slice(-4)}1ZD`.slice(0, 15).padEnd(15, 'Z');

  try {
    // Execute Scenario A + Idempotency check
    const resA1 = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: caseReg.id,
      actorId: buyer.id,
      marketplaceHint: 'DIRECT',
      orderIdHint: 'ORD-TS-778899',
      productNameHint: 'Portable SSD 1 TB',
      idempotencyKey: `idem-a-${suffix}`,
      inMemoryDocuments: [
        {
          evidenceId: evReg.id,
          filename: evReg.filename,
          mimeType: 'application/pdf',
          rawText:
            'Tax Invoice\nSold By: TechStore Retail Private Limited\nSeller GSTIN: 29AABCT1234E1Z5\nOrder ID: ORD-TS-778899',
        },
      ],
    });
    assert.equal(resA1.screening.passed, true);
    assert.equal(resA1.gatewayResult?.selectedChannel, 'SELLER_PORTAL');
    assert.equal(resA1.gatewayResult?.requestStatus, 'DELIVERED');
    assert.equal(resA1.gatewayResult?.relatedOrganizationId, 'org_techstore');

    const resA2 = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: caseReg.id,
      actorId: buyer.id,
      marketplaceHint: 'DIRECT',
      orderIdHint: 'ORD-TS-778899',
      productNameHint: 'Portable SSD 1 TB',
      idempotencyKey: `idem-a-${suffix}`,
      inMemoryDocuments: [
        {
          evidenceId: evReg.id,
          filename: evReg.filename,
          mimeType: 'application/pdf',
          rawText: 'Sold By: TechStore Retail Private Limited\nSeller GSTIN: 29AABCT1234E1Z5',
        },
      ],
    });
    assert.equal(resA2.gatewayResult?.requestId, resA1.gatewayResult?.requestId);

    const updatedCaseA = await prisma.caseRecord.findUniqueOrThrow({ where: { id: caseReg.id } });
    assert.equal(updatedCaseA.organizationId, 'org_techstore');

    // Execute Scenario B: Unregistered Flipkart Seller
    const resB = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: caseUnreg.id,
      actorId: buyer.id,
      marketplaceHint: 'Flipkart',
      orderIdHint: 'OD438897692023711100',
      productNameHint: 'SonicPro Headphones',
      idempotencyKey: `idem-b-${suffix}`,
      inMemoryDocuments: [
        {
          evidenceId: evUnreg.id,
          filename: evUnreg.filename,
          mimeType: 'application/pdf',
          rawText: `Transportation Bill of Supply\nFlipkart India Private Limited\n---\nSold By: Suri Consumer Private Limited\nSeller GSTIN: ${unregGstin}\nOrder ID: OD438897692023711100`,
        },
      ],
    });
    assert.equal(resB.gatewayResult?.selectedChannel, 'CUSTOMER_ASSISTED_HELP_CENTRE');
    assert.equal(resB.gatewayResult?.requestStatus, 'CUSTOMER_ACTION_REQUIRED');
    assert.equal(resB.gatewayResult?.marketplaceSupportUrl, 'https://www.flipkart.com/helpcentre');
    assert.equal(resB.gatewayResult?.relatedOrganizationId, null);

    const caseBAfter = await prisma.caseRecord.findUniqueOrThrow({ where: { id: caseUnreg.id } });
    assert.equal(caseBAfter.organizationId, null, 'Unregistered marketplace case must NEVER leak to demo org_techstore');

    // Report customer submission -> must move to MARKETPLACE_SUPPORT_PENDING, NOT DELIVERED_TO_SELLER
    assert.ok(resB.gatewayResult?.requestId);
    const updatedB = await SellerCommunicationGatewayService.recordCustomerReportedSubmission({
      requestId: resB.gatewayResult.requestId,
      buyerId: buyer.id,
      ticketReference: 'FK-SUP-9911',
      note: 'Submitted message via Flipkart Help Centre',
    });
    assert.equal(updatedB.status, 'MARKETPLACE_SUPPORT_PENDING');
    assert.ok(updatedB.customerReportedSubmissionAt);

    // Execute Scenario C: Ambiguous unreadable extraction -> REVIEW_REQUIRED, no request dispatched
    const resC = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: caseAmb.id,
      actorId: buyer.id,
      marketplaceHint: 'Amazon',
      orderIdHint: 'ORD-AMB-11',
      idempotencyKey: `idem-c-${suffix}`,
      inMemoryDocuments: [
        {
          evidenceId: evAmb.id,
          filename: evAmb.filename,
          mimeType: 'application/pdf',
          rawText: 'Illegible invoice scan ### ??? @@@',
        },
      ],
    });
    assert.equal(resC.gatewayResult?.selectedChannel, 'REVIEW_REQUIRED');
    assert.equal(resC.gatewayResult?.requestId, null);
    assert.ok(resC.sellerMatchId);

    // Human investigator resolves Scenario C match -> executes portal gateway cleanly
    const resolvedC = await SellerWorkflowOrchestrator.resolveAmbiguousMatch({
      caseId: caseAmb.id,
      sellerMatchId: resC.sellerMatchId,
      sellerId: 'sel_techstore_verified',
      reviewerId: admin.id,
      reviewNotes: 'Confirmed TechStore invoice from secondary receipt',
    });
    assert.equal(resolvedC.gatewayResult.selectedChannel, 'SELLER_PORTAL');
    assert.equal(resolvedC.gatewayResult.requestStatus, 'DELIVERED');
  } finally {
    await prisma.caseRecord.deleteMany({
      where: { id: { in: [caseReg.id, caseUnreg.id, caseAmb.id] } },
    });
    await prisma.sellerDirectoryEntry.deleteMany({
      where: { gstin: unregGstin },
    });
  }
});
