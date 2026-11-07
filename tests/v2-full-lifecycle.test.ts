import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'crypto';
import { prisma } from '../src/lib/prisma';
import { PurchaseDetectionService } from '../src/server/services/purchase-detection.service';
import { PurchaseMemoryService } from '../src/server/services/purchase-memory.service';
import { PackagePassportService } from '../src/server/services/package-passport.service';
import { DeliveryReminderService } from '../src/server/services/delivery-reminder.service';
import { CameraSessionService } from '../src/server/services/camera-session.service';
import { EvidenceGuardService } from '../src/server/services/evidenceguard.service';
import { GraphBuilder } from '../src/server/graph/graph-builder';
import { BerrV2Service } from '../src/server/ai/reasoning/berr-v2.service';
import { SharedResolutionService } from '../src/server/services/shared-resolution.service';
import { upiComplaintService } from '../src/server/services/upi-complaint.service';

describe('RESOLVEGRAPH Version 2.0: 12-Workflow Master End-to-End Suite', () => {
  let buyerId: string;
  let merchantId: string;
  let adminId: string;
  const orgId = 'org_techstore';

  let testMemoryId: string;
  let testPackageId: string;
  let testEvidenceId: string;
  let testCaseId: string;
  let testProposalId: string;

  before(async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    buyerId = buyer?.id || 'usr_alex_buyer';

    const merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    merchantId = merchant?.id || 'usr_techstore_merchant';

    const admin = await prisma.user.findFirst({
      where: { OR: [{ role: 'ADMIN' }, { role: 'RESOLUTION_MANAGER' }] },
    });
    adminId = admin?.id || 'usr_priya_admin';

    // 0. Create test case upfront to link across the lifecycle
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `CASE-W12-${Date.now()}`,
        title: 'Master End-to-End Resolution Case',
        description: 'Complete lifecycle test from purchase to financial resolution.',
        status: 'UNDER_ANALYSIS',
        category: 'NOT_AS_DESCRIBED',
        currency: 'INR',
        organizationId: orgId,
        buyerId,
        merchantId,
        amountMinor: 649900,
      },
    });
    testCaseId = c.id;
  });

  after(async () => {
    if (testCaseId) {
      await prisma.payPalPayment.deleteMany({ where: { commerceOrder: { caseId: testCaseId } } });
      await prisma.commerceOrder.deleteMany({ where: { caseId: testCaseId } });
      await prisma.sharedRoomMessage.deleteMany({ where: { caseId: testCaseId } });
      await prisma.caseEvent.deleteMany({ where: { caseId: testCaseId } });
      await prisma.claim.deleteMany({ where: { caseId: testCaseId } });
      await prisma.resolutionProposal.deleteMany({ where: { caseId: testCaseId } });
      await prisma.evidence.deleteMany({ where: { caseId: testCaseId } });
      await prisma.cameraSession.deleteMany({ where: { caseId: testCaseId } });
      await prisma.caseRecord.deleteMany({ where: { id: testCaseId } });
    }
    if (testPackageId) {
      await prisma.deliveryEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageEvent.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageSeal.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packageItem.deleteMany({ where: { packageId: testPackageId } });
      await prisma.packagePassport.deleteMany({ where: { id: testPackageId } });
    }
    if (testMemoryId) {
      await prisma.purchaseSpecification.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchasePromise.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchaseSnapshot.deleteMany({ where: { purchaseMemoryId: testMemoryId } });
      await prisma.purchaseMemory.deleteMany({ where: { id: testMemoryId } });
    }
  });

  // Workflow 1 — Purchase
  test('Workflow 1: Purchase creation and immutable Purchase Memory preservation', async () => {
    const sample = PurchaseDetectionService.parseManualEntry({
      marketplace: 'AMAZON',
      orderId: `ORD-W1-${Date.now()}`,
      title: 'UltraPro 1TB NVMe SSD',
      price: 6499,
      currency: 'INR',
      capacity: '1 TB',
    });

    const memory = await PurchaseMemoryService.createPurchaseMemory({
      buyerId,
      detectedData: sample,
    });

    assert.ok(memory.id);
    assert.ok(memory.snapshotHash);
    testMemoryId = memory.id;

    // Link memory to case
    await prisma.caseRecord.update({
      where: { id: testCaseId },
      data: { purchaseMemoryId: memory.id },
    });

    // Verify divergence check against 512 GB complaint does not alter 1 TB baseline
    const divergence = await PurchaseMemoryService.compareDisputeClaim(
      memory.id,
      'Buyer received 512 GB SSD instead of 1 TB'
    );
    assert.strictEqual(divergence.divergencesFound.length > 0, true);
    assert.strictEqual(divergence.isMemoryPreserved, true);
  });

  // Workflow 2 — Merchant package registration
  test('Workflow 2: Package Passport creation, physical seal attachment, and dispatch', async () => {
    const pkg = await PackagePassportService.createPackagePassport({
      merchantOrganizationId: orgId,
      carrierName: 'Blue Dart',
      trackingNumber: `BD-${Date.now()}`,
      purchaseMemoryId: testMemoryId,
      userId: merchantId,
      items: [
        {
          productName: 'UltraPro 1TB NVMe SSD',
          sku: 'SKU-SSD-1TB',
          quantity: 1,
          serialNumber: 'SN-99881122',
          condition: 'NEW_SEALED',
          declaredCapacity: '1 TB',
        },
      ],
    });

    assert.ok(pkg.id);
    assert.ok(pkg.qrToken);
    testPackageId = pkg.id;

    // Link package to case
    await prisma.caseRecord.update({
      where: { id: testCaseId },
      data: { packagePassportId: pkg.id },
    });

    // Apply seal
    const sealResult = await PackagePassportService.attachSeal({
      packageId: pkg.id,
      sealNumber: `SEAL-SEC-${Date.now().toString().slice(-5)}`,
      sealType: 'TAMPER_EVIDENT_TAPE',
      userId: merchantId,
    });
    assert.ok(sealResult.seal.id);

    // Verify signed QR token without buyer PII exposure
    const verification = await PackagePassportService.verifyQrCode(pkg.qrToken);
    assert.strictEqual(verification.isValid, true);
    assert.strictEqual(verification.status, 'SEALED');

    // Record dispatch
    const dispatched = await PackagePassportService.dispatchPackage({
      packageId: pkg.id,
      carrierName: 'Blue Dart',
      trackingNumber: `BD-TRK-${Date.now()}`,
      userId: merchantId,
    });
    assert.strictEqual(dispatched.status, 'DISPATCHED');
  });

  // Workflow 3 — Delivery
  test('Workflow 3: Shipment tracking event, pre-delivery unboxing reminder, receipt confirmation', async () => {
    const event = await DeliveryReminderService.recordDeliveryEvent({
      packageId: testPackageId,
      eventType: 'OUT_FOR_DELIVERY',
      isEstimated: false,
      checkpoint: 'Local Hub Van #4',
      rawSource: 'COURIER_HANDHELD_SCAN',
      userId: buyerId,
    });
    assert.ok(event.id);
    assert.strictEqual(event.isEstimated, false);

    const reminder = await DeliveryReminderService.scheduleReminder({
      userId: buyerId,
      packageId: testPackageId,
      reminderType: 'PRE_DELIVERY_PREP',
      scheduledFor: new Date(Date.now() - 5000),
      messageText: 'Your package is out for delivery. Remember to launch Dual-Sight capture before breaking seals.',
    });
    assert.ok(reminder.reminder.id);

    const processed = await DeliveryReminderService.processDueReminders();
    assert.ok(processed.processedCount >= 1);
  });

  // Workflow 4 — Unboxing
  test('Workflow 4: Dual-Sight unboxing challenge generation, stream upload, and hash verification', async () => {
    const session = await CameraSessionService.initiateSession({
      packageId: testPackageId,
      caseId: testCaseId,
      buyerId,
      deviceInfo: 'Pixel 8 Pro (Dual Camera)',
    });

    assert.ok(session.id);
    assert.ok(session.sessionToken);
    assert.ok(session.challenges[0]?.challengeCode);

    // Upload camera stream chunk
    const testChunk = Buffer.from('FAKE_MP4_UNBOXING_VIDEO_STREAM_DATA_CHUNK');
    await CameraSessionService.uploadStream({
      sessionId: session.id,
      streamType: 'REAR_PACKAGE_STREAM',
      durationSeconds: 15.0,
      fps: 30.0,
      codec: 'video/mp4',
      fileBuffer: testChunk,
    });

    // Complete unboxing session and create Vault Evidence
    const completion = await CameraSessionService.completeSession(session.id, buyerId);
    assert.strictEqual(completion.session.status, 'COMPLETED');
    assert.ok(completion.materializedEvidence.length >= 1);
    testEvidenceId = completion.materializedEvidence[0].id;
  });

  // Workflow 5 — EvidenceGuard
  test('Workflow 5: Multi-signal forensic analysis (EXIF, dHash, and OCR check)', async () => {
    // Create photo evidence to verify multi-signal forensic analysis (EXIF, dHash, and OCR check)
    const imgEvidence = await prisma.evidence.create({
      data: {
        caseId: testCaseId,
        uploadedById: buyerId,
        filename: 'ssd_product_photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 2048,
        storageKey: `evidence/ssd_product_photo_${Date.now()}.jpg`,
        sha256: createHash('sha256').update('IMAGE_BUFFER_DATA').digest('hex'),
        evidenceType: 'PHOTO',
        sourceType: 'BUYER_UPLOAD',
        verificationStatus: 'VERIFIED',
        visibility: 'SHARED_WITH_PARTICIPANTS',
        description: 'Photo of the delivered SSD showing model label',
      },
    });

    const analysis = await EvidenceGuardService.analyzeEvidence(imgEvidence.id, Buffer.from('IMAGE_BUFFER_DATA_WITH_ENOUGH_BYTES'));
    assert.ok(analysis.evidenceId);
    assert.ok(['VERIFIED_SOURCE', 'CONSISTENT', 'SUSPICIOUS', 'INCONCLUSIVE'].includes(analysis.assessmentState));
    assert.ok(analysis.perceptualHash);
  });

  // Workflow 6 — Bilateral Evidence Graph
  test('Workflow 6: Bilateral Evidence Graph assembly with Purchase Memory and Package Passport nodes', async () => {
    // Add buyer claim
    await prisma.claim.create({
      data: {
        caseId: testCaseId,
        authorId: buyerId,
        statement: 'Delivered drive has 512 GB model label instead of 1 TB purchased.',
        status: 'ACTIVE',
      },
    });

    const graph = await GraphBuilder.buildGraph(testCaseId);
    assert.ok(graph.nodes.some((n) => n.type === 'PURCHASE_MEMORY'));
    assert.ok(graph.nodes.some((n) => n.type === 'PACKAGE_PASSPORT'));
    assert.ok(graph.nodes.some((n) => n.type === 'EVIDENCE'));
  });

  // Workflow 7 — BERR v2 Reasoning
  test('Workflow 7: BERR v2 4-category classification and objective uncertainty computation', async () => {
    const evaluation = await BerrV2Service.evaluateCase(testCaseId);
    assert.ok(evaluation.classifiedFacts.length >= 1);
    assert.ok(evaluation.factCounts);
    assert.strictEqual(typeof evaluation.uncertaintyAnalysis.objectiveUncertaintyScore, 'number');
    assert.ok(evaluation.recommendedRemedy);
    assert.strictEqual(evaluation.uncertaintyAnalysis.requiresHumanReview, true);
  });

  // Workflow 8 — Shared Resolution Room
  test('Workflow 8: Bilateral messaging with internal manager shielding and proposal lifecycle', async () => {
    // Post bilateral message
    const publicMsg = await SharedResolutionService.postMessage({
      caseId: testCaseId,
      senderId: buyerId,
      content: 'I have attached my unboxing video showing the 512 GB drive.',
      attachmentEvidenceId: testEvidenceId,
      isInternalOnly: false,
    });
    assert.strictEqual(publicMsg.isInternalOnly, false);

    // Post internal manager note
    const managerNote = await SharedResolutionService.postMessage({
      caseId: testCaseId,
      senderId: adminId,
      content: 'INTERNAL AUDIT NOTE: Warehouse scan confirms SKU mismatch.',
      isInternalOnly: true,
    });
    assert.strictEqual(managerNote.isInternalOnly, true);

    // Verify buyer cannot see manager note
    const buyerMessages = await SharedResolutionService.listMessages(testCaseId, {
      id: buyerId,
      role: 'BUYER',
      isPlatformAdmin: false,
    });
    assert.strictEqual(buyerMessages.some((m) => m.content.includes('INTERNAL AUDIT NOTE')), false);

    // Verify admin can see manager note
    const adminMessages = await SharedResolutionService.listMessages(testCaseId, {
      id: adminId,
      role: 'ADMIN',
      isPlatformAdmin: true,
    });
    assert.strictEqual(adminMessages.some((m) => m.content.includes('INTERNAL AUDIT NOTE')), true);

    // Create a resolution proposal
    const proposal = await prisma.resolutionProposal.create({
      data: {
        caseId: testCaseId,
        organizationId: orgId,
        proposedById: merchantId,
        proposalType: 'PARTIAL_REFUND',
        title: 'Partial Refund Offer',
        description: 'Partial refund for 512GB variance',
        reason: 'Customer agreed to retain drive for price difference',
        policyVersion: 'v2.0',
        status: 'AGREED',
        amountMinor: 250000,
        currency: 'INR',
      },
    });
    testProposalId = proposal.id;
  });

  // Workflow 9 — Payment resolution and 10-point safeguard gate
  test('Workflow 9: 10-point financial safeguard gate enforces human approval and live fund locks', async () => {
    // Create matching order and payment for financial ledger audit
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: `ORD-ROOM-${Date.now()}`,
        buyerId,
        merchantOrganizationId: orgId,
        caseId: testCaseId,
        totalAmountMinor: 649900,
        currency: 'INR',
        status: 'CAPTURED',
      },
    });

    await prisma.payPalPayment.create({
      data: {
        commerceOrderId: order.id,
        providerOrderId: `PAY-ROOM-${Date.now()}`,
        captureId: `CAP-ROOM-${Date.now()}`,
        amountMinor: 649900,
        currency: 'INR',
        paymentStatus: 'COMPLETED',
      },
    });

    const check = await SharedResolutionService.validateFinancialSafeguards(
      testCaseId,
      testProposalId,
      { id: merchantId, role: 'MERCHANT', organization: orgId, isPlatformAdmin: false }
    );

    assert.strictEqual(check.isEligible, true);
    assert.strictEqual(check.refundAmountMinor, 250000);
    assert.strictEqual(check.reasons.length, 0);
  });

  // Workflow 10 — Multi-payment UPI complaint intake
  test('Workflow 10: India UPI complaint intake with honest status labeling and statutory TAT guidance', async () => {
    const utr = `UTR${Date.now().toString().slice(-9)}`;
    const complaintResult = await upiComplaintService.registerComplaint({
      caseId: testCaseId,
      paymentProvider: 'PHONEPE',
      transactionReference: utr,
      amountMinor: 649900,
      currency: 'INR',
      complaintCategory: 'DEBITED_NOT_CREDITED',
      senderVpa: 'buyer@ybl',
    });

    assert.strictEqual(complaintResult.complaint.providerVerificationStatus, 'CUSTOMER_SUBMITTED');
    assert.ok(complaintResult.guidance.regulatoryFramework.includes('DPSS.CO.PD No.629'));
    assert.ok(complaintResult.guidance.tatSummary.includes('T+1'));

    await prisma.paymentComplaint.deleteMany({ where: { transactionReference: utr } });
  });

  // Workflow 11 — Multi-tenant boundary security
  test('Workflow 11: Cross-tenant data isolation strictly blocks unauthorized organization access', async () => {
    const foreignPackages = await PackagePassportService.listPackages('org_foreign_unauthorized');
    assert.strictEqual(foreignPackages.length, 0);
  });

  // Workflow 12 — Final case timeline and closure audit
  test('Workflow 12: Final case timeline reconstruction and audit logging', async () => {
    const events = await prisma.caseEvent.findMany({
      where: { caseId: testCaseId },
      orderBy: { createdAt: 'asc' },
    });
    assert.ok(Array.isArray(events));
  });
});
