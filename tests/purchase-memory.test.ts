import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { PurchaseDetectionService } from '../src/server/services/purchase-detection.service';
import { PurchaseMemoryService } from '../src/server/services/purchase-memory.service';

describe('RESOLVEGRAPH Version 2.0: Purchase Memory & Smart Detection Suite', () => {
  let testBuyerId: string;
  let createdMemoryId: string;

  before(async () => {
    // Find or create test buyer
    let user = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `buyer.test.${Date.now()}@example.com`,
          fullName: 'Test Buyer Alex',
          role: 'BUYER',
        },
      });
    }
    testBuyerId = user.id;
  });

  after(async () => {
    if (createdMemoryId) {
      await prisma.purchaseSpecification.deleteMany({ where: { purchaseMemoryId: createdMemoryId } });
      await prisma.purchasePromise.deleteMany({ where: { purchaseMemoryId: createdMemoryId } });
      await prisma.purchaseSnapshot.deleteMany({ where: { purchaseMemoryId: createdMemoryId } });
      await prisma.purchaseMemory.delete({ where: { id: createdMemoryId } }).catch(() => {});
    }
  });

  test('Module 05: detects Amazon order confirmation email with 1 TB SSD and ₹6,499 price', async () => {
    const emailSample = `
From: auto-confirm@amazon.in
Subject: Your Amazon.in order of Crucial P3 Plus 1TB PCIe 4.0 3D NAND NVMe M.2 SSD...
Order # 402-8829104-1928472

Hello Alex,
Thank you for your order. We will send a confirmation when your package ships.

Details:
Item: Crucial P3 Plus 1 TB PCIe 4.0 3D NAND NVMe M.2 SSD up to 5000MB/s - CT1000P3PSSD8
Condition: New
Sold by: Appario Retail Private Ltd
Quantity: 1
Item Subtotal: ₹6,499.00
Order Total: ₹6,499.00
Arriving: 12 November 2026
    `;

    const detected = await PurchaseDetectionService.detectPurchase({
      sourceType: 'EMAIL_FORWARD',
      rawText: emailSample,
      buyerId: testBuyerId,
    });

    assert.equal(detected.marketplace, 'AMAZON');
    assert.equal(detected.externalOrderId, '402-8829104-1928472');
    assert.equal(detected.currency, 'INR');
    assert.equal(detected.priceMinor, 649900); // ₹6,499.00 in minor paise
    assert.equal(detected.sellerName, 'Appario Retail Private Ltd');
    assert.ok(detected.specifications.some((s) => s.key === 'storage_capacity' && s.value === '1 TB'));
    assert.ok(detected.snapshotHash.length === 64);
  });

  test('Module 05: detects duplicate purchases accurately based on externalOrderId', async () => {
    // Register sample
    const sample = PurchaseDetectionService.parseManualEntry({
      marketplace: 'FLIPKART',
      orderId: `OD-DUP-${Date.now()}`,
      title: 'Samsung T7 Shield 1TB SSD',
      price: 8999,
      currency: 'INR',
    });

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId: testBuyerId,
      detectedData: sample,
    });

    // Check duplicate detection
    const secondCheck = await PurchaseDetectionService.detectPurchase({
      sourceType: 'MANUAL',
      structuredData: {
        marketplace: 'FLIPKART',
        orderId: sample.externalOrderId,
        title: 'Samsung T7 Shield 1TB SSD',
      },
      buyerId: testBuyerId,
    });

    assert.equal(secondCheck.isDuplicate, true);
    assert.equal(secondCheck.duplicateMemoryId, memory.id);

    // Clean up
    await prisma.purchaseSpecification.deleteMany({ where: { purchaseMemoryId: memory.id } });
    await prisma.purchasePromise.deleteMany({ where: { purchaseMemoryId: memory.id } });
    await prisma.purchaseSnapshot.deleteMany({ where: { purchaseMemoryId: memory.id } });
    await prisma.purchaseMemory.delete({ where: { id: memory.id } });
  });

  test('Module 06: creates and persists immutable Purchase Memory with cryptographic snapshot', async () => {
    const rawData = PurchaseDetectionService.parseEmailText(`
From: orders@techstore.com
Order: TECH-99120
Product: Kingston NV2 1 TB M.2 2280 NVMe SSD
Price: $79.99
RAM: 16 GB Memory Kit Included
    `, 'EMAIL_FORWARD');

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId: testBuyerId,
      detectedData: rawData,
    });

    createdMemoryId = memory.id;

    assert.ok(memory.id);
    assert.equal(memory.listingTitle, 'Kingston NV2 1 TB M.2 2280 NVMe SSD');
    assert.ok(memory.snapshotHash.length === 64);
    assert.ok(memory.specifications.length >= 1);
    assert.ok(memory.promises.length >= 1);
    assert.ok(memory.snapshots.length >= 1);
    assert.equal(memory.snapshots[0].sha256, memory.snapshotHash);
  });

  test('Module 06 ACCEPTANCE TEST: 1 TB SSD order is preserved and NOT overwritten by 512 GB complaint', async () => {
    assert.ok(createdMemoryId, 'Requires createdMemoryId from previous step');

    // Complaint assertion: Buyer claims that delivered SSD was only 512 GB
    const disputeClaim = 'The courier delivered the package but inside was a 512 GB SSD instead of the 1 TB ordered.';

    const comparison = await PurchaseMemoryService.compareDisputeClaim(createdMemoryId, disputeClaim);

    // 1. Verify original specifications still record 1 TB
    assert.equal(comparison.originalSpecifications['storage_capacity'], '1 TB');

    // 2. Verify divergence was detected
    assert.equal(comparison.divergencesFound.length, 1);
    assert.equal(comparison.divergencesFound[0].specKey, 'storage_capacity');
    assert.equal(comparison.divergencesFound[0].originalPromise, '1 TB');
    assert.equal(comparison.divergencesFound[0].claimedDiscrepancy, '512 GB');

    // 3. Verify original database record in SQLite remains 100% intact and not mutated
    const refreshed = await PurchaseMemoryService.getPurchaseMemoryById(createdMemoryId);
    assert.ok(refreshed);
    const capSpec = refreshed?.specifications.find((s) => s.specKey === 'storage_capacity');
    assert.equal(capSpec?.specValue, '1 TB');
    assert.equal(comparison.isMemoryPreserved, true);
  });
});
