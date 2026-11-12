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
  BuyerScreeningService,
  SellerEvidenceRequirementsService,
  SellerExtractionService,
} from '@/server/seller';

const FLIPKART_INVOICE_FIXTURE = `
Tax Invoice / Bill of Supply / Cash Memo
Transportation Bill of Supply
Billed From: Flipkart India Private Limited
Outer Ring Road, Bengaluru, Karnataka
GSTIN: 29AABCF8078M1Z9
Shipping Charges: Rs. 40.00
Order ID: OD438897692023711100

----------------------------------------------------
Page 2 — Tax Invoice
Sold By: Suri Consumer Private Limited
Address: Industrial Estate, Peenya Phase II, Bengaluru, Karnataka 560058
Seller GSTIN: 29ABDCS9580N1ZD
Invoice Number: FABJ2400991122
Order ID: OD438897692023711100
Product: SonicPro Wireless Headphones
Total Amount: Rs. 2,999.00
PAN: ABDCS9580N
`;

test('Role-aware extraction selects actual product seller and separates transportation/marketplace entity', () => {
  const extracted = SellerExtractionService.extractFromText({
    text: FLIPKART_INVOICE_FIXTURE,
    marketplaceHint: 'Flipkart',
    orderIdHint: 'OD438897692023711100',
    productNameHint: 'SonicPro Wireless Headphones',
    sourceDocumentId: 'ev_fixture_fk_1',
    pageNumber: 2,
  });

  assert.equal(extracted.legalName, 'Suri Consumer Private Limited');
  assert.equal(extracted.gstin, '29ABDCS9580N1ZD');
  assert.equal(extracted.marketplace, 'FLIPKART');
  assert.equal(extracted.orderId, 'OD438897692023711100');
  assert.equal(extracted.invoiceNumber, 'FABJ2400991122');
  assert.equal(extracted.state, 'Karnataka');
  assert.equal(extracted.isAmbiguous, false);

  // PAN must be masked + hashed, never exposed raw
  assert.ok(extracted.panMasked?.startsWith('ABXXX'));
  assert.ok(extracted.panMasked?.endsWith('N'));
  assert.ok(extracted.panHash && extracted.panHash.length > 20);
  assert.equal(extracted.panMasked?.includes('ABDCS9580N'), false);

  // Logistics / Bill of Supply entity must NOT be promoted as SELLER
  const flipkartTransport = extracted.detectedEntities.find((e) =>
    /flipkart india private limited/i.test(e.name)
  );
  assert.ok(flipkartTransport, 'Expected Flipkart India Private Limited to be detected as separate entity');
  assert.notEqual(flipkartTransport?.role, 'SELLER');

  const actualSeller = extracted.detectedEntities.find(
    (e) => e.role === 'SELLER' && /suri consumer/i.test(e.name)
  );
  assert.ok(actualSeller, 'Expected Suri Consumer Private Limited classified as SELLER');
});

test('Ambiguous or OCR-degraded invoice flags human review instead of guessing', () => {
  const degraded = SellerExtractionService.extractFromText({
    text: 'Sold By: ###@@@???\nOrder ID: OD999111222333\nMarketplace: Amazon',
    marketplaceHint: 'Amazon',
  });
  assert.equal(degraded.isAmbiguous, true);
  assert.ok(degraded.ambiguityReasons.length >= 1);

  const competing = SellerExtractionService.extractFromText({
    text: `
      Sold By: Alpha Retail Private Limited
      GSTIN: 29AAAAA1111A1Z1
      Supplier: Beta Electronics Private Limited
      GSTIN: 27BBBBB2222B1Z2
      Order ID: 403-1111111-2222222
    `,
  });
  assert.equal(competing.isAmbiguous, true);
  assert.ok(
    competing.ambiguityReasons.some((r) => r.toLowerCase().includes('multiple distinct seller'))
  );
});

test('Complaint-specific evidence requirements tailor checklist without making carrier logs mandatory', () => {
  const wrongProduct = SellerEvidenceRequirementsService.generateRequirements({
    category: 'NOT_AS_DESCRIBED',
    originalCategory: 'Wrong Product',
    productName: 'Mechanical Keyboard',
    orderId: 'ORD-111',
  });
  assert.equal(wrongProduct.categoryKey, 'WRONG_PRODUCT');
  assert.ok(wrongProduct.items.some((i) => i.key === 'packing_photograph'));
  assert.ok(wrongProduct.items.some((i) => i.key === 'product_sku_info' && i.mandatory));

  const missingItem = SellerEvidenceRequirementsService.generateRequirements({
    category: 'NON_DELIVERY',
    originalCategory: 'Item Missing',
  });
  assert.equal(missingItem.categoryKey, 'MISSING_ITEM');
  const weightLog = missingItem.items.find((i) => i.key === 'package_weight_info');
  assert.ok(weightLog);
  assert.equal(weightLog.mandatory, false, 'Shipment weight log must never be coercive');

  const damaged = SellerEvidenceRequirementsService.generateRequirements({
    category: 'DAMAGED_GOODS',
  });
  assert.equal(damaged.categoryKey, 'DAMAGED_PRODUCT');
  assert.ok(damaged.items.some((i) => i.key === 'packaging_condition_records'));
});

test('Buyer evidence screening gate blocks missing/infected/rejected uploads and passes clean uploads', async () => {
  const suffix = Date.now();
  const buyer = await prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } });

  const caseNoEvidence = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-SCR-NOEV-${suffix}`,
      title: 'No Evidence Screening Test',
      description: 'Test no evidence gating',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 100000,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
    },
  });

  const caseInfected = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-SCR-INF-${suffix}`,
      title: 'Infected Evidence Screening Test',
      description: 'Test infected gating',
      category: CaseCategory.DAMAGED_GOODS,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 150000,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
    },
  });

  await prisma.evidence.create({
    data: {
      caseId: caseInfected.id,
      uploadedById: buyer.id,
      filename: 'bad.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1200,
      storageKey: 'nonexistent.pdf',
      sha256: `hash-bad-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.REJECTED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.INFECTED,
    },
  });

  const caseClean = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-TST-SCR-OK-${suffix}`,
      title: 'Clean Evidence Screening Test',
      description: 'Test clean screening gate',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 250000,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
    },
  });

  const cleanEv = await prisma.evidence.create({
    data: {
      caseId: caseClean.id,
      uploadedById: buyer.id,
      filename: 'invoice-clean.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2400,
      storageKey: 'clean.pdf',
      sha256: `hash-clean-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });

  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: cleanEv.id,
      assessmentState: 'REQUIRES_REVIEW',
      confidence: 0.9,
      findingsSummary: 'Clean structural upload ready for review',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  try {
    const resNoEv = await BuyerScreeningService.evaluateCaseScreening(caseNoEvidence.id, {
      runGuardIfMissing: false,
    });
    assert.equal(resNoEv.passed, false);
    assert.equal(resNoEv.screeningState, 'BLOCKED_NO_EVIDENCE');

    const resInf = await BuyerScreeningService.evaluateCaseScreening(caseInfected.id, {
      runGuardIfMissing: false,
    });
    assert.equal(resInf.passed, false);
    assert.equal(resInf.screeningState, 'BLOCKED_REJECTED_OR_INFECTED');

    const resClean = await BuyerScreeningService.evaluateCaseScreening(caseClean.id, {
      runGuardIfMissing: false,
    });
    assert.equal(resClean.passed, true);
    assert.equal(resClean.screeningState, 'PASSED');
    assert.deepEqual(resClean.eligibleDocumentIds, [cleanEv.id]);
  } finally {
    await prisma.caseRecord.deleteMany({
      where: { id: { in: [caseNoEvidence.id, caseInfected.id, caseClean.id] } },
    });
  }
});
