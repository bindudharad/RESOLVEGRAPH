import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { CaseService } from '../src/server/services/case.service';
import { DashboardService } from '../src/server/services/dashboard.service';
import { EvidenceService } from '../src/server/services/evidence.service';
import {
  CaseStatus,
  CasePriority,
  CaseCategory,
  PartyRole,
  ClaimType,
  EvidenceType,
  EvidenceSource,
  VerificationStatus,
  EvidenceVisibility,
} from '../src/generated/prisma/client';

describe('ResolveGraph Database & Backend Service Suite', () => {
  before(async () => {
    // Verify connection to SQLite
    const userCount = await prisma.user.count();
    assert.ok(userCount >= 4, 'Database should be seeded with at least 4 users');
  });

  test('Database connection and seed verification', async () => {
    const cases = await prisma.caseRecord.count();
    assert.ok(cases >= 10, 'Database should have at least 10 seeded cases');

    const featured = await prisma.caseRecord.findUnique({
      where: { caseNumber: 'RG-1001' },
      include: { claims: true, evidence: true, events: true },
    });

    assert.ok(featured, 'Case RG-1001 must exist');
    assert.equal(featured.amountMinor, 649900, 'RG-1001 minor amount must equal 649900 paise');
    assert.ok(featured.claims.length >= 2, 'RG-1001 must have seeded claims');
    assert.ok(featured.evidence.length >= 3, 'RG-1001 must have seeded evidence');
    assert.ok(featured.events.length >= 3, 'RG-1001 must have append-only audit events');
  });

  test('CaseService.listCases handles pagination and filtering', async () => {
    const page1 = await CaseService.listCases({ page: 1, limit: 5 });
    assert.equal(page1.items.length, 5);
    assert.equal(page1.pagination.page, 1);
    assert.equal(page1.pagination.limit, 5);
    assert.ok(page1.pagination.total >= 10);
    assert.ok(page1.pagination.totalPages >= 2);

    // Filter by status
    const underAnalysis = await CaseService.listCases({ status: 'UNDER_ANALYSIS' });
    for (const c of underAnalysis.items) {
      assert.equal(c.status, CaseStatus.UNDER_ANALYSIS);
    }

    // Search by title or case number
    const searched = await CaseService.listCases({ search: 'RG-1001' });
    assert.ok(searched.items.length >= 1);
    assert.equal(searched.items[0].caseNumber, 'RG-1001');
  });

  test('CaseService.getCaseById retrieves rich case record', async () => {
    const c = await CaseService.getCaseById('RG-1001');
    assert.ok(c, 'Must find RG-1001');
    assert.equal(c.amount, 6499, 'Computed major unit amount must be 6499');
    assert.equal(c.customer, 'Alex Morgan');
    assert.ok(
      c.merchant === 'TechStore Retail LLC' || c.merchant === 'TechStore Global',
      `Merchant should match seeded TechStore name, received: ${c.merchant}`
    );
    assert.ok(c.claims.length > 0);
    assert.ok(c.evidence.length > 0);
  });

  test('CaseService.createCase creates case and emits CASE_CREATED event', async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    const merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });
    assert.ok(buyer && merchant);

    const created = await CaseService.createCase({
      title: 'Automated Test Defective Unit',
      description: 'Testing case creation with minor currency units and event ledger logging.',
      category: CaseCategory.DAMAGED_GOODS,
      priority: CasePriority.HIGH,
      amountMinor: 125000, // 1,250.00
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: merchant.id,
    });

    assert.ok(created.id.startsWith('RG-'));
    assert.equal(created.amountMinor, 125000);
    assert.equal(created.amount, 1250);

    // Verify audit event was logged in transaction
    const events = await prisma.caseEvent.findMany({
      where: { caseId: created.dbId },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].eventType, 'CASE_CREATED');
  });

  test('CaseService.updateCase enforces valid status transitions and logs events', async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    const merchant = await prisma.user.findFirst({ where: { role: 'MERCHANT' } });

    const testCase = await CaseService.createCase({
      title: 'State Transition Test Case',
      description: 'Testing state machine transitions and validation logic.',
      category: CaseCategory.OTHER,
      priority: CasePriority.LOW,
      amountMinor: 5000,
      currency: 'USD',
      buyerId: buyer!.id,
      merchantId: merchant!.id,
    });

    // Valid transition: SUBMITTED -> IN_REVIEW
    const transitioned = await CaseService.updateCase(testCase.caseNumber, {
      status: CaseStatus.IN_REVIEW,
      note: 'Manager began formal review',
    });
    assert.equal(transitioned.status, CaseStatus.IN_REVIEW);

    // Verify STATUS_CHANGED event was created
    const events = await prisma.caseEvent.findMany({
      where: { caseId: testCase.dbId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(events.some((e) => e.eventType === 'STATUS_CHANGED'));

    // Illegal transition: IN_REVIEW -> DRAFT should fail
    await assert.rejects(
      async () => {
        await CaseService.updateCase(testCase.caseNumber, {
          status: CaseStatus.DRAFT,
        });
      },
      /Illegal status transition/
    );
  });

  test('CaseService.addClaim and addEvidence record items and emit events', async () => {
    const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
    const c = await CaseService.getCaseById('RG-1001');
    assert.ok(c && buyer);

    // Add claim
    const claim = await CaseService.addClaim(c.caseNumber, {
      authorId: buyer.id,
      partyRole: PartyRole.BUYER,
      claimType: ClaimType.DEFECTIVE_OR_DAMAGED,
      statement: 'Additional test claim regarding secondary wear and tear.',
    });
    assert.ok(claim.id);

    // Add evidence
    const evidence = await CaseService.addEvidence(c.caseNumber, {
      uploadedById: buyer.id,
      claimId: claim.id,
      filename: 'test-evidence-document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 154200,
      storageKey: 'evidence/test/test-doc.pdf',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      evidenceType: EvidenceType.PHOTO,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.VERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
    });
    assert.ok(evidence.id);

    const latestEvents = await prisma.caseEvent.findMany({
      where: { caseId: c.dbId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    assert.equal(latestEvents[0].eventType, 'EVIDENCE_UPLOADED');
    assert.equal(latestEvents[1].eventType, 'CLAIM_ADDED');
  });

  test('DashboardService.getSummary aggregates DB counts accurately', async () => {
    const summary = await DashboardService.getSummary();

    assert.ok(summary.kpis.totalCases.value >= 10);
    assert.ok(summary.kpis.openCases.value >= 1);
    assert.ok(summary.categoryDistribution.length > 0);
    assert.ok(summary.recentCases.length >= 1);
    assert.ok(summary.recentEvents.length >= 1);
  });

  test('EvidenceService.listEvidence queries workspace evidence metadata', async () => {
    const evidenceList = await EvidenceService.listEvidence({ limit: 10 });
    assert.ok(evidenceList.items.length >= 1);
    assert.ok(evidenceList.pagination.total >= 1);

    const item = evidenceList.items[0];
    assert.ok(item.name);
    assert.ok(item.caseId);
    assert.ok(item.sha256);
  });
});
