import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { GraphBuilder } from '../src/server/graph/graph-builder';
import { BerrV2Service } from '../src/server/ai/reasoning/berr-v2.service';
import { PurchaseDetectionService } from '../src/server/services/purchase-detection.service';
import { PurchaseMemoryService } from '../src/server/services/purchase-memory.service';
import { PackagePassportService } from '../src/server/services/package-passport.service';

describe('RESOLVEGRAPH Version 2.0: BEG & BERR v2 Intelligence Suite', () => {
  let testCaseId: string;
  let testBuyerId: string;
  let testMerchantId: string;
  let testMemoryId: string;
  let testPackageId: string;
  const testOrgId = 'org_techstore';

  before(async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    testBuyerId = buyer?.id || 'usr_buyer_alex';

    const merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    testMerchantId = merchant?.id || 'usr_techstore_merchant';

    // 1. Create dedicated case
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `CASE-BEG-${Date.now()}`,
        title: 'Bilateral Evidence Graph & BERR v2 Test Case',
        description: 'Test case for verifying graph extensions and BERR v2 4-category classification.',
        category: 'NOT_AS_DESCRIBED',
        buyerId: testBuyerId,
        merchantId: testMerchantId,
        organizationId: testOrgId,
        amountMinor: 7999,
        currency: 'USD',
      },
    });
    testCaseId = c.id;

    // 2. Create Purchase Memory
    const detected = PurchaseDetectionService.parseManualEntry({
      marketplace: 'AMAZON',
      orderId: `ORD-BEG-${Date.now()}`,
      title: 'Crucial P3 Plus 1TB NVMe SSD',
      price: 79.99,
      currency: 'USD',
      capacity: '1 TB',
    });

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId: testBuyerId,
      detectedData: detected,
    });
    testMemoryId = memory.id;

    // 3. Create Package Passport
    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: testOrgId,
      purchaseMemoryId: testMemoryId,
      items: [{ productName: 'Crucial P3 Plus 1TB NVMe SSD', declaredCapacity: '1 TB' }],
      userId: testMerchantId,
    });
    testPackageId = pkg.id;

    // 4. Attach seal
    await PackagePassportService.attachSeal({
      packageId: testPackageId,
      sealNumber: 'SEAL-BEG-99124',
      sealType: 'TAMPER_EVIDENT_TAPE',
      userId: testMerchantId,
    });

    // 5. Add Claim
    await prisma.claim.create({
      data: {
        caseId: testCaseId,
        authorId: testBuyerId,
        statement: 'Package arrived with intact tape, but the SSD model inside is only 512 GB instead of 1 TB.',
        status: 'ACTIVE',
      },
    });

    // Link memory & package to case
    await prisma.caseRecord.update({
      where: { id: testCaseId },
      data: {
        purchaseMemoryId: testMemoryId,
        packagePassportId: testPackageId,
      },
    });
  });

  after(async () => {
    if (testCaseId) {
      await prisma.claim.deleteMany({ where: { caseId: testCaseId } });
      await prisma.caseRecord.delete({ where: { id: testCaseId } }).catch(() => {});
    }
    if (testPackageId) {
      await prisma.packageSeal.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageItem.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packagePassport.delete({ where: { id: testPackageId } }).catch(() => {});
    }
    if (testMemoryId) {
      await prisma.purchaseSpecification.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchasePromise.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchaseSnapshot.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchaseMemory.delete({ where: { id: testMemoryId } }).catch(() => {});
    }
  });

  test('Module 14: Bilateral Evidence Graph includes Purchase Memory, Package Passport, and Seal nodes', async () => {
    const graph = await GraphBuilder.buildGraph(testCaseId);

    assert.ok(graph.nodes.length >= 6);

    // Verify V2 nodes exist
    const pmNode = graph.nodes.find((n) => n.type === 'PURCHASE_MEMORY');
    assert.ok(pmNode);
    assert.equal(pmNode?.label, 'Crucial P3 Plus 1TB NVMe SSD');

    const pkgNode = graph.nodes.find((n) => n.type === 'PACKAGE_PASSPORT');
    assert.ok(pkgNode);

    const sealNode = graph.nodes.find((n) => n.type === 'PACKAGE_SEAL');
    assert.ok(sealNode);
    assert.equal(sealNode?.label, 'SEAL-BEG-99124');

    // Verify V2 edges exist
    const promiseEdge = graph.edges.find((e) => e.type === 'PROMISES_SPEC');
    assert.ok(promiseEdge);

    const packEdge = graph.edges.find((e) => e.type === 'PACKED_IN');
    assert.ok(packEdge);

    const sealEdge = graph.edges.find((e) => e.type === 'SEALED_WITH');
    assert.ok(sealEdge);
  });

  test('Module 15: BERR v2 classifies facts into AGREED, VERIFIED, CONTESTED, and MISSING', async () => {
    const evaluation = await BerrV2Service.evaluateCase(testCaseId);

    assert.ok(evaluation.classifiedFacts.length >= 3);

    // 1. AGREED: Price
    const agreedFact = evaluation.classifiedFacts.find((f) => f.classification === 'AGREED');
    assert.ok(agreedFact);
    assert.equal(agreedFact?.field, 'transaction_amount');

    // 2. VERIFIED: Seal
    const verifiedFact = evaluation.classifiedFacts.find((f) => f.classification === 'VERIFIED');
    assert.ok(verifiedFact);
    assert.equal(verifiedFact?.field, 'tamper_evident_seal');

    // 3. CONTESTED: Capacity (1 TB vs 512 GB)
    const contestedFact = evaluation.classifiedFacts.find((f) => f.classification === 'CONTESTED');
    assert.ok(contestedFact);
    assert.equal(contestedFact?.field, 'storage_capacity');
    assert.equal(contestedFact?.merchantAssertion, '1 TB');
    assert.equal(contestedFact?.buyerAssertion, '512 GB');

    // Counts check
    assert.ok(evaluation.factCounts.agreed >= 1);
    assert.ok(evaluation.factCounts.verified >= 1);
    assert.ok(evaluation.factCounts.contested >= 1);
  });

  test('Module 15: BERR v2 enforces financial safety and requires human review for contested cases', async () => {
    const evaluation = await BerrV2Service.evaluateCase(testCaseId);

    assert.equal(evaluation.recommendedRemedy.type, 'REPLACEMENT');
    assert.equal(evaluation.recommendedRemedy.financialSafetyApproved, false); // Safeguard active
    assert.equal(evaluation.uncertaintyAnalysis.requiresHumanReview, true);
    assert.ok(evaluation.uncertaintyAnalysis.remainingUncertainties.length >= 1);

    // Metrics check
    assert.ok(evaluation.metrics.evidenceTraceabilityCoverage >= 0.95);
    assert.equal(evaluation.metrics.policyCompliance, 1.0);
  });
});
