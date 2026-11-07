import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { EvidenceGuardService } from '../src/server/services/evidenceguard.service';
import { PurchaseDetectionService } from '../src/server/services/purchase-detection.service';
import { PurchaseMemoryService } from '../src/server/services/purchase-memory.service';

describe('RESOLVEGRAPH Version 2.0: EvidenceGuard AI Forensics Suite', () => {
  let testCaseId: string;
  let testUserId: string;
  let testEvidenceId1: string;
  let testEvidenceId2: string;
  let testMemoryId: string;

  before(async () => {
    const user = await prisma.user.findFirst();
    testUserId = user?.id || 'user_test';

    const c = await prisma.caseRecord.findFirst();
    testCaseId = c?.id || 'case_test';

    // Create a Purchase Memory for invoice cross-checking
    const detected = PurchaseDetectionService.parseManualEntry({
      marketplace: 'AMAZON',
      orderId: 'ORD-INV-99001',
      title: 'Crucial P3 Plus 1TB SSD',
      price: 79.99,
      currency: 'USD',
      capacity: '1 TB',
    });

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId: testUserId,
      detectedData: detected,
    });
    testMemoryId = memory.id;

    // Link memory to test case
    await prisma.caseRecord.update({
      where: { id: testCaseId },
      data: { purchaseMemoryId: testMemoryId },
    });

    // Create test evidence records
    const ev1 = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: testUserId,
        filename: 'ssd_product_photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4096,
        storageKey: 'evidence/ssd_product_photo.jpg',
        sha256: 'a1b2c3d4e5f67890123456789012345678901234567890123456789012345678',
        evidenceType: 'PHOTO',
        sourceType: 'BUYER_UPLOAD',
      },
    });
    testEvidenceId1 = ev1.id;

    const ev2 = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: testUserId,
        filename: 'tax_invoice_official.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 8192,
        storageKey: 'evidence/tax_invoice_official.pdf',
        sha256: 'b2c3d4e5f6789012345678901234567890123456789012345678901234567890',
        evidenceType: 'INVOICE',
        sourceType: 'BUYER_UPLOAD',
      },
    });
    testEvidenceId2 = ev2.id;
  });

  after(async () => {
    await prisma.evidenceAnalysisResult.deleteMany({
      where: { evidenceId: { in: [testEvidenceId1, testEvidenceId2] } },
    });
    await prisma.evidence.deleteMany({
      where: { id: { in: [testEvidenceId1, testEvidenceId2] } },
    });
    if (testMemoryId) {
      await prisma.caseRecord.update({
        where: { id: testCaseId },
        data: { purchaseMemoryId: null },
      });
      await prisma.purchaseSpecification.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchasePromise.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchaseSnapshot.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchaseMemory.delete({ where: { id: testMemoryId } }).catch(() => {});
    }
  });

  test('Module 12: analyzes genuine image, computes dHash, and verifies non-duplicate status', async () => {
    // Synthetic JPEG header with EXIF APP1 marker
    const jpegBuffer = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10]),
      Buffer.from('Exif\0\0'),
      Buffer.from('IMAGE_BINARY_PIXEL_DATA_PAYLOAD_CHUNK_1024'),
    ]);

    const result = await EvidenceGuardService.analyzeEvidence(testEvidenceId1, jpegBuffer);

    assert.equal(result.evidenceId, testEvidenceId1);
    assert.equal(result.isDuplicateImage, false);
    assert.ok(result.perceptualHash);
    assert.ok(result.signals.length >= 2);

    // Verify EXIF signal was detected
    const exifSignal = result.signals.find((s) => s.type === 'METADATA_INTEGRITY');
    assert.ok(exifSignal);
    assert.equal(exifSignal?.status, 'PASS');
  });

  test('Module 12: detects duplicate visual dHash footprint across different uploads', async () => {
    // Upload a third evidence record with the identical visual payload
    const ev3 = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: testUserId,
        filename: 'another_case_ssd_photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4096,
        storageKey: 'evidence/another_case_ssd_photo.jpg',
        sha256: 'c3d4e5f678901234567890123456789012345678901234567890123456789012',
        evidenceType: 'PHOTO',
        sourceType: 'BUYER_UPLOAD',
      },
    });

    const identicalBuffer = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10]),
      Buffer.from('Exif\0\0'),
      Buffer.from('IMAGE_BINARY_PIXEL_DATA_PAYLOAD_CHUNK_1024'),
    ]);

    const dupResult = await EvidenceGuardService.analyzeEvidence(ev3.id, identicalBuffer);

    assert.equal(dupResult.isDuplicateImage, true);
    assert.equal(dupResult.duplicateEvidenceId, testEvidenceId1);
    assert.equal(dupResult.assessmentState, 'SUSPICIOUS');
    assert.equal(dupResult.humanReviewRecommended, true);

    // Clean up
    await prisma.evidenceAnalysisResult.deleteMany({ where: { evidenceId: ev3.id } });
    await prisma.evidence.delete({ where: { id: ev3.id } });
  });

  test('Module 12: cross-checks invoice against Purchase Memory and validates authentic source', async () => {
    // Text matching Purchase Memory (Order: ORD-INV-99001, Price: $79.99)
    const matchingInvoicePdfText = Buffer.from(`
TAX INVOICE - APPARIO RETAIL
Order ID: ORD-INV-99001
Item: Crucial P3 Plus 1TB SSD
Total Amount: $79.99 USD
Payment Status: Completed
    `);

    const result = await EvidenceGuardService.analyzeEvidence(testEvidenceId2, matchingInvoicePdfText);

    assert.equal(result.assessmentState, 'VERIFIED_SOURCE');
    const invoiceSignal = result.signals.find((s) => s.type === 'INVOICE_CROSS_CHECK');
    assert.ok(invoiceSignal);
    assert.equal(invoiceSignal?.status, 'PASS');
  });

  test('Module 12: detects altered invoice contradicting Purchase Memory terms', async () => {
    const alteredInvoicePdfText = Buffer.from(`
TAX INVOICE - APPARIO RETAIL
Order ID: ORD-INV-99001
Item: Crucial P3 Plus 1TB SSD
Total Amount: $199.99 USD [TAMPERED_INVOICE]
    `);

    const result = await EvidenceGuardService.analyzeEvidence(testEvidenceId2, alteredInvoicePdfText);

    assert.equal(result.assessmentState, 'SUSPICIOUS');
    assert.equal(result.humanReviewRecommended, true);
    const invoiceSignal = result.signals.find((s) => s.type === 'INVOICE_CROSS_CHECK');
    assert.ok(invoiceSignal);
    assert.equal(invoiceSignal?.status, 'FAIL');
  });

  test('Module 12: evaluates video stream and flags temporal discontinuity', async () => {
    const corruptedVideoStreamText = Buffer.from('MOCK_VIDEO_STREAM_WITH_corrupted_stream_repeated_frames_INDICATORS');

    const videoEv = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: testUserId,
        filename: 'unboxing_tampered.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 10240,
        storageKey: 'evidence/unboxing_tampered.mp4',
        sha256: 'd4e5f67890123456789012345678901234567890123456789012345678901234',
        evidenceType: 'OTHER',
      },
    });

    const result = await EvidenceGuardService.analyzeEvidence(videoEv.id, corruptedVideoStreamText);

    assert.equal(result.assessmentState, 'SUSPICIOUS');
    const videoSignal = result.signals.find((s) => s.type === 'VIDEO_TEMPORAL_CONTINUITY');
    assert.ok(videoSignal);
    assert.equal(videoSignal?.status, 'FAIL');

    // Clean up
    await prisma.evidenceAnalysisResult.deleteMany({ where: { evidenceId: videoEv.id } });
    await prisma.evidence.delete({ where: { id: videoEv.id } });
  });
});
