import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { LifecycleIntelligenceService } from '../src/server/ai/intelligence/lifecycle-intelligence.service';
import { PurchaseDetectionService } from '../src/server/services/purchase-detection.service';
import { PurchaseMemoryService } from '../src/server/services/purchase-memory.service';
import { PackagePassportService } from '../src/server/services/package-passport.service';

describe('RESOLVEGRAPH Version 2.0: Multimodal Case Intelligence Suite', () => {
  let testCaseId: string;
  let testBuyerId: string;
  let testMemoryId: string;
  let testPackageId: string;

  before(async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    testBuyerId = buyer?.id || 'usr_buyer_alex';

    const merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    const merchantId = merchant?.id || 'usr_techstore_merchant';
    const org = await prisma.organization.findFirst();
    const orgId = org?.id || 'org_techstore';

    // 1. Create a dedicated test case
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `CASE-INTEL-${Date.now()}`,
        title: 'Multimodal Intelligence Divergence Test Case',
        description: 'Test case for verifying lifecycle fact extraction and divergence detection.',
        category: 'NOT_AS_DESCRIBED',
        buyerId: testBuyerId,
        merchantId,
        organizationId: orgId,
      },
    });
    testCaseId = c.id;

    // 2. Create Purchase Memory with 1 TB specification
    const detected = PurchaseDetectionService.parseManualEntry({
      marketplace: 'AMAZON',
      orderId: `ORD-INTEL-${Date.now()}`,
      title: 'Crucial P3 Plus 1TB PCIe 4.0 NVMe SSD',
      price: 79.99,
      currency: 'USD',
      capacity: '1 TB',
    });

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId: testBuyerId,
      detectedData: detected,
    });
    testMemoryId = memory.id;

    // 3. Create Package Passport with declared 1 TB capacity
    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: orgId,
      purchaseMemoryId: testMemoryId,
      items: [
        {
          productName: 'Crucial P3 Plus 1TB NVMe SSD',
          declaredCapacity: '1 TB',
          condition: 'NEW_SEALED',
        },
      ],
      userId: merchantId,
    });
    testPackageId = pkg.id;

    // 4. Attach tamper seal
    await PackagePassportService.attachSeal({
      packageId: testPackageId,
      sealNumber: 'SEAL-INTEL-8812',
      sealType: 'TAMPER_EVIDENT_TAPE',
      userId: merchantId,
    });

    // 5. Add a Claim where buyer asserts a 512 GB SSD was inside
    const claim = await prisma.claim.create({
      data: {
        caseId: testCaseId,
        authorId: testBuyerId,
        statement: 'The delivery package arrived with intact seals, but inside was a 512 GB SSD model instead of 1 TB.',
        status: 'ACTIVE',
      },
    });

    // Link memory and package to case
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

  test('Module 13: aggregates multimodal facts across Purchase, Packing, Seal, and Claim milestones', async () => {
    const report = await LifecycleIntelligenceService.analyzeCaseLifecycle(testCaseId);

    assert.ok(report.allFacts.length >= 4);

    const purchaseFact = report.allFacts.find((f) => f.milestone === 'PURCHASE' && f.field === 'storage_capacity');
    assert.ok(purchaseFact);
    assert.equal(purchaseFact?.value, '1 TB');

    const packingFact = report.allFacts.find((f) => f.milestone === 'PACKING' && f.field === 'storage_capacity');
    assert.ok(packingFact);
    assert.equal(packingFact?.value, '1 TB');

    const sealFact = report.allFacts.find((f) => f.milestone === 'SEALING');
    assert.ok(sealFact);
    assert.equal(sealFact?.value, 'INTACT');

    const claimFact = report.allFacts.find((f) => f.milestone === 'DISPUTE_CLAIM' && f.field === 'storage_capacity');
    assert.ok(claimFact);
    assert.equal(claimFact?.value, '512 GB');
  });

  test('Module 13: pinpoints exact lifecycle divergence point (1 TB promised/packed vs 512 GB claimed)', async () => {
    const report = await LifecycleIntelligenceService.analyzeCaseLifecycle(testCaseId);

    assert.equal(report.divergences.length, 1);
    const div = report.divergences[0];

    assert.equal(div.field, 'storage_capacity');
    assert.equal(div.priorMilestoneValue, '1 TB');
    assert.equal(div.divergentValue, '512 GB');
    assert.equal(report.integrityVerdict, 'POST_FULFILLMENT_DIVERGENCE');
    assert.ok(report.summary.includes('Lifecycle Divergence Detected'));
  });
});
