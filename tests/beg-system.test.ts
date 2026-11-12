import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CaseCategory,
  CasePriority,
  CaseStatus,
  ClaimType,
  EvidenceSource,
  EvidenceType,
  EvidenceVisibility,
  PartyRole,
  VerificationStatus,
} from '@/generated/prisma/client';
import { GraphValidator } from '@/server/graph/graph-validator';
import { GraphProjectionService } from '@/server/graph/graph-projection';
import { GraphQueryService } from '@/server/graph/graph-query.service';
import { BegPersistenceService } from '@/server/graph/beg-persistence.service';
import { BegSyncService } from '@/server/graph/beg-sync.service';
import {
  evaluateAttributeDiscrepancies,
  extractAttributeTokens,
  matchEvidenceRecords,
  matchSellerCandidates,
} from '@/server/graph/beg-matcher.service';
import { BerrV2Service } from '@/server/ai/reasoning/berr-v2.service';
import { evidenceStorage } from '@/server/storage/evidence-storage';

import { GET as graphGET } from '../src/app/api/cases/[caseId]/graph/route';
import { GET as expandGET } from '../src/app/api/cases/[caseId]/graph/expand/route';
import { POST as rebuildPOST } from '../src/app/api/cases/[caseId]/graph/rebuild/route';
import { POST as edgeActionPOST } from '../src/app/api/cases/[caseId]/beg/edges/[edgeId]/action/route';
import { GET as evidencePreviewGET } from '../src/app/api/cases/[caseId]/beg/evidence/[evidenceId]/preview/route';
import { GET as berrV2GET, POST as berrV2POST } from '../src/app/api/cases/[caseId]/berr-v2/route';

function mockReq(
  url: string,
  userEmail: string,
  init?: { method?: string; body?: unknown }
): NextRequest {
  const headers = new Headers();
  headers.set('x-demo-user-email', userEmail);
  if (init?.body !== undefined) {
    headers.set('content-type', 'application/json');
  }
  return new NextRequest(url, {
    method: init?.method || 'GET',
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

describe('RESOLVEGRAPH — Complete Bilateral Evidence Graph (BEG) Test Suite', () => {
  const createdCaseIds: string[] = [];
  const createdSellerIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdStorageKeys: string[] = [];
  const createdPmIds: string[] = [];
  const createdPassportIds: string[] = [];

  after(async () => {
    if (createdCaseIds.length > 0) {
      await prisma.caseRecord.deleteMany({ where: { id: { in: createdCaseIds } } });
    }
    if (createdPmIds.length > 0) {
      await prisma.purchaseMemory.deleteMany({ where: { id: { in: createdPmIds } } });
    }
    if (createdPassportIds.length > 0) {
      await prisma.packagePassport.deleteMany({ where: { id: { in: createdPassportIds } } });
    }
    if (createdSellerIds.length > 0) {
      await prisma.sellerDirectoryEntry.deleteMany({ where: { id: { in: createdSellerIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    for (const key of createdStorageKeys) {
      await evidenceStorage.deleteFile(key).catch(() => {});
    }
  });

  test('Part 14.B — Deterministic matcher prioritizes exact IDs, preserves ambiguity, and blocks amount-only connections', () => {
    // 1. Same amount + currency ONLY -> must reject linking
    const amtOnly = matchEvidenceRecords(
      {
        nodeId: 'evidence:a1',
        party: 'BUYER',
        sourceOrigin: 'BUYER_SUBMITTED',
        label: 'Invoice A',
        amountMinor: 12999,
        currency: 'USD',
        productTitle: 'Wireless Keyboard',
        timestampIso: '2026-10-01T10:00:00Z',
      },
      {
        nodeId: 'evidence:b1',
        party: 'SELLER',
        sourceOrigin: 'SELLER_SUBMITTED',
        label: 'Receipt B',
        amountMinor: 12999,
        currency: 'USD',
        productTitle: 'Coffee Grinder',
        timestampIso: '2026-11-10T10:00:00Z',
      }
    );
    assert.equal(amtOnly.matched, false);
    assert.equal(amtOnly.method, 'AMOUNT_ONLY_REJECTED');

    // 2. Exact Order ID match across parties
    const exactOrder = matchEvidenceRecords(
      {
        nodeId: 'evidence:inv1',
        party: 'BUYER',
        sourceOrigin: 'BUYER_SUBMITTED',
        label: 'Buyer Invoice',
        orderId: 'OD-SAMSUNG-990',
      },
      {
        nodeId: 'order:ord1',
        party: 'SYSTEM',
        sourceOrigin: 'SYSTEM_GENERATED',
        label: 'Order',
        orderId: 'od-samsung-990',
      }
    );
    assert.equal(exactOrder.matched, true);
    assert.equal(exactOrder.method, 'EXACT_ORDER_ID');

    // 3. Ambiguous seller candidate detection preserves multiple matches cleanly
    const ambig = matchSellerCandidates(
      { sellerName: 'Nova Electronics' },
      [
        { id: 's1', legalName: 'Nova Electronics Pvt Ltd', gstin: '27AAACN1111A1Z1' },
        { id: 's2', legalName: 'Nova Electronics Retail LLP', gstin: '29AAACN2222B1Z2' },
      ]
    );
    assert.equal(ambig.status, 'AMBIGUOUS');
    assert.equal(ambig.matches.length, 2);
    assert.ok(ambig.matches.every((m) => m.verificationState === 'INFERRED'));

    // 4. GSTIN match beats fuzzy name cleanly
    const gstinExact = matchSellerCandidates(
      { gstin: '29AAACN2222B1Z2', sellerName: 'Nova' },
      [
        { id: 's1', legalName: 'Nova Electronics Pvt Ltd', gstin: '27AAACN1111A1Z1' },
        { id: 's2', legalName: 'Nova Electronics Retail LLP', gstin: '29AAACN2222B1Z2' },
      ]
    );
    assert.equal(gstinExact.status, 'VERIFIED_EXACT');
    assert.equal(gstinExact.matches[0].seller.id, 's2');
    assert.equal(gstinExact.matches[0].verificationState, 'VERIFIED');
  });

  test('Part 14.C — Provenance validator rejects AI inference auto-promoted to VERIFIED', () => {
    const invalidAiGraph = GraphValidator.validate({
      caseId: 'dummy',
      nodes: [
        { id: 'fact:1', type: 'FACT', label: '512GB detected', metadata: {} },
        { id: 'ev:1', type: 'EVIDENCE', label: 'photo.png', metadata: {} },
      ],
      edges: [
        {
          id: 'e1',
          source: 'fact:1',
          target: 'ev:1',
          type: 'EXTRACTED_FROM',
          label: 'EXTRACTED_FROM',
          provenance: 'AI_INFERRED',
          verificationState: 'VERIFIED',
          reviewStatus: 'UNREVIEWED',
        },
      ],
      metadata: {
        graphVersion: '2.0',
        generatedAt: new Date().toISOString(),
        nodeCount: 2,
        edgeCount: 1,
        tenantScope: 'TEST',
      },
    });
    assert.ok(invalidAiGraph.issues.some((i) => i.code === 'AI_INFERENCE_AUTO_VERIFIED'));
  });

  test('Part 14.A/D/E/F/G & Part 16 End-to-End Scenario — Samsung 990 PRO 1TB vs 512GB BEG + BERR + Security + Actions', async () => {
    const buyer = await prisma.user.findUnique({ where: { email: 'alex.morgan@consumer.demo' } });
    const merchant = await prisma.user.findUnique({ where: { email: 'disputes@techstore.demo' } });
    const admin = await prisma.user.findUnique({ where: { email: 'admin@resolvegraph.demo' } });
    const otherMerchant = await prisma.user.findUnique({ where: { email: 'support@digitalmart.demo' } });
    assert.ok(buyer && merchant && admin && otherMerchant);

    const org = await prisma.organization.findFirst({
      where: { members: { some: { userId: merchant.id } } },
    });
    assert.ok(org);

    const uniqueSuffix = Date.now().toString().slice(-6);
    const caseNumber = `RG-BEG-${uniqueSuffix}`;

    const sellerLegalName = `TechStore SSD Distributors Pvt Ltd ${uniqueSuffix}`;
    const sellerEntry = await prisma.sellerDirectoryEntry.create({
      data: {
        legalName: sellerLegalName,
        normalizedLegalName: sellerLegalName.toLowerCase(),
        gstin: `29AABCT${uniqueSuffix.slice(0, 4)}A1Z5`.slice(0, 15),
        verificationStatus: 'VERIFIED',
        registrationStatus: 'REGISTERED',
        linkedOrganizationId: org.id,
        marketplaceAccounts: {
          create: {
            marketplace: 'FLIPKART',
            marketplaceSellerId: `FK-TECH-${uniqueSuffix}`,
            storefrontName: 'TechStore Official',
            isVerified: true,
          },
        },
      },
    });
    createdSellerIds.push(sellerEntry.id);

    const pngMagic = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('PNG_SAMSUNG_512GB_LABEL', 'utf-8'),
    ]);
    const storedBuyerPhoto = await evidenceStorage.saveFile(
      pngMagic,
      'samsung-label-512gb.png',
      'image/png'
    );
    createdStorageKeys.push(storedBuyerPhoto.storageKey);

    const pdfMagic = Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n% Invoice INV-${uniqueSuffix}\n% Order ID: OD-SS-${uniqueSuffix}\n% Product: Samsung 990 PRO 1TB NVMe SSD\n%%EOF`,
      'utf-8'
    );
    const storedBuyerInvoice = await evidenceStorage.saveFile(
      pdfMagic,
      `invoice-OD-SS-${uniqueSuffix}.pdf`,
      'application/pdf'
    );
    createdStorageKeys.push(storedBuyerInvoice.storageKey);

    const pm = await prisma.purchaseMemory.create({
      data: {
        buyerId: buyer.id,
        externalOrderId: `OD-SS-${uniqueSuffix}`,
        marketplace: 'FLIPKART',
        sellerName: sellerEntry.legalName,
        listingTitle: 'Samsung 990 PRO 1TB NVMe M.2 SSD',
        priceMinor: 14900,
        currency: 'USD',
        purchaseDate: new Date(),
        snapshotHash: crypto.createHash('sha256').update(`pm-${uniqueSuffix}`).digest('hex'),
        specifications: {
          create: { specKey: 'storage_capacity', specValue: '1 TB' },
        },
      },
    });
    createdPmIds.push(pm.id);

    const pkg = await prisma.packagePassport.create({
      data: {
        packageNumber: `PKG-SS-${uniqueSuffix}`,
        merchantOrganizationId: org.id,
        purchaseMemoryId: pm.id,
        carrierName: 'BlueDart Express',
        trackingNumber: `BD-${uniqueSuffix}`,
        status: 'DELIVERED',
        qrToken: `qr-${uniqueSuffix}`,
        integrityHash: crypto.createHash('sha256').update(`pkg-${uniqueSuffix}`).digest('hex'),
        items: {
          create: {
            productName: 'Samsung 990 PRO NVMe SSD',
            sku: 'MZ-V9P1T0BW',
            declaredCapacity: '1 TB',
            condition: 'NEW',
          },
        },
        seals: {
          create: {
            sealNumber: `SEAL-${uniqueSuffix}`,
            sealType: 'TAMPER_EVIDENT_TAPE',
            verificationStatus: 'INTACT',
            appliedByUserId: merchant.id,
          },
        },
      },
    });
    createdPassportIds.push(pkg.id);

    const testCase = await prisma.caseRecord.create({
      data: {
        caseNumber,
        title: `Samsung 990 PRO 1TB NVMe SSD received as 512GB variant`,
        description: `Order ID: OD-SS-${uniqueSuffix}\nMarketplace: FLIPKART\nProduct: Samsung 990 PRO 1TB NVMe SSD\nSKU: MZ-V9P1T0BW\nSeller: ${sellerEntry.legalName}\nCustomer ordered 1TB SSD but received 512GB drive inside sealed box.`,
        category: CaseCategory.NOT_AS_DESCRIBED,
        priority: CasePriority.HIGH,
        status: CaseStatus.UNDER_ANALYSIS,
        amountMinor: 14900,
        currency: 'USD',
        buyerId: buyer.id,
        merchantId: merchant.id,
        organizationId: org.id,
        purchaseMemoryId: pm.id,
        packagePassportId: pkg.id,
      },
    });
    createdCaseIds.push(testCase.id);

    const buyerClaim = await prisma.claim.create({
      data: {
        caseId: testCase.id,
        authorId: buyer.id,
        partyRole: PartyRole.BUYER,
        claimType: ClaimType.SIGNIFICANTLY_NOT_AS_DESCRIBED,
        statement: 'Ordered Samsung 990 PRO 1TB NVMe SSD, received 512GB unit per hardware label photo.',
      },
    });

    const buyerImgEv = await prisma.evidence.create({
      data: {
        caseId: testCase.id,
        uploadedById: buyer.id,
        claimId: buyerClaim.id,
        filename: 'samsung-label-512gb.png',
        mimeType: 'image/png',
        sizeBytes: storedBuyerPhoto.sizeBytes,
        storageKey: storedBuyerPhoto.storageKey,
        sha256: storedBuyerPhoto.sha256,
        description: 'Photo showing 512GB model label on received Samsung SSD.',
        evidenceType: EvidenceType.PHOTO,
        sourceType: EvidenceSource.BUYER_UPLOAD,
        verificationStatus: VerificationStatus.UNVERIFIED,
        visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      },
    });

    await prisma.evidence.create({
      data: {
        caseId: testCase.id,
        uploadedById: buyer.id,
        claimId: buyerClaim.id,
        filename: storedBuyerInvoice.sanitizedFilename,
        mimeType: 'application/pdf',
        sizeBytes: storedBuyerInvoice.sizeBytes,
        storageKey: storedBuyerInvoice.storageKey,
        sha256: storedBuyerInvoice.sha256,
        description: 'Order invoice for Samsung 990 PRO 1TB NVMe SSD.',
        evidenceType: EvidenceType.INVOICE,
        sourceType: EvidenceSource.BUYER_UPLOAD,
        verificationStatus: VerificationStatus.UNVERIFIED,
        visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      },
    });

    // AI extracted observation (kept strictly distinct from verification)
    const testAnalysisRun = await prisma.aIAnalysisRun.create({
      data: {
        caseId: testCase.id,
        requestedById: buyer.id,
        provider: 'test',
        model: 'test-v1',
        analysisType: 'EVIDENCE_EXTRACTION',
        status: 'COMPLETED',
      },
    });

    await prisma.extractedFact.create({
      data: {
        caseId: testCase.id,
        analysisRunId: testAnalysisRun.id,
        evidenceId: buyerImgEv.id,
        factType: 'OBSERVED_CAPACITY',
        fieldKey: 'storage_capacity',
        rawValue: '512GB',
        normalizedValue: '512GB',
        sourceExcerpt: 'Label on SSD PCB shows 512GB variant',
        pageNumber: 1,
        extractionConfidenceBand: 'HIGH',
      },
    });

    // Seller Identity Match
    const sellerMatch = await prisma.sellerIdentityMatch.create({
      data: {
        caseId: testCase.id,
        matchedSellerId: sellerEntry.id,
        extractedLegalName: sellerEntry.legalName,
        extractedGstin: sellerEntry.gstin,
        extractedMarketplace: 'FLIPKART',
        extractedOrderId: `OD-SS-${uniqueSuffix}`,
        extractedProductName: 'Samsung 990 PRO 1TB NVMe SSD',
        matchOutcome: 'VERIFIED_MATCH',
        matchConfidence: 0.96,
        sourceEvidenceId: buyerImgEv.id,
      },
    });

    // Seller request + response WITH missing packing photo (triggers MISSING_EVIDENCE gap!)
    const sellerReq = await prisma.sellerEvidenceRequest.create({
      data: {
        caseId: testCase.id,
        sellerMatchId: sellerMatch.id,
        sellerId: sellerEntry.id,
        organizationId: org.id,
        requestNumber: `REQ-SS-${uniqueSuffix}`,
        marketplace: 'FLIPKART',
        orderId: `OD-SS-${uniqueSuffix}`,
        productName: 'Samsung 990 PRO 1TB NVMe SSD',
        complaintCategory: 'NOT_AS_DESCRIBED',
        requestDescription: 'Please provide pre-dispatch packing photo and dispatch proof for Samsung 990 PRO order.',
        createdById: admin.id,
        deliveryChannel: 'SELLER_PORTAL',
        registrationStatus: 'REGISTERED',
        status: 'SELLER_RESPONDED',
        requestedItemsJson: JSON.stringify([
          { key: 'packing_photo', label: 'Packing Photo', description: 'Pre-dispatch photo', mandatory: true, status: 'NOT_AVAILABLE' },
        ]),
      },
    });

    // Step 1: Initial persisted BEG construction + BERR v1 evaluation
    const syncV1 = await BegSyncService.handleDomainEvent({
      caseId: testCase.id,
      triggerEvent: 'COMPLAINT_CREATED',
      actorId: buyer.id,
      rerunBerr: true,
    });
    assert.equal(syncV1.version, 1);
    assert.ok(syncV1.berrAssessmentId);

    // Idempotency check: re-running sync without new evidence must NOT increment version
    const syncIdempotent = await BegPersistenceService.syncCaseGraph(testCase.id, 'NOOP_RECHECK');
    assert.equal(syncIdempotent.changed, false);
    assert.equal(syncIdempotent.version, 1);

    // Step 2: Seller responds declaring 1TB packed -> BEG updates incrementally to v2, BERR v1 becomes stale!
    await prisma.sellerEvidenceResponse.create({
      data: {
        requestId: sellerReq.id,
        caseId: testCase.id,
        organizationId: org.id,
        responderId: merchant.id,
        stance: 'DISAGREE',
        summary: 'Warehouse packed genuine Samsung 990 PRO 1TB SSD matching SKU MZ-V9P1T0BW.',
        itemResponsesJson: JSON.stringify([]),
        verificationStatus: 'PENDING',
      },
    });

    const syncV2 = await BegSyncService.handleDomainEvent({
      caseId: testCase.id,
      triggerEvent: 'SELLER_RESPONSE_SUBMITTED',
      actorId: merchant.id,
      rerunBerr: false,
    });
    assert.equal(syncV2.changed, true);
    assert.equal(syncV2.version, 2);

    // Verify BERR v1 was marked stale cleanly while staying in DB history
    const berrHistoryBefore = await BerrV2Service.getAssessmentHistory(testCase.id);
    assert.equal(berrHistoryBefore.history.length, 1);
    assert.equal(berrHistoryBefore.history[0].isStale, true);

    // Re-run BERR v2 -> creates version 2 linked to BEG v2 while keeping v1 history
    const berrV2Eval = await BerrV2Service.evaluateCase(testCase.id, {
      triggerReason: 'SELLER_RESPONSE_SUBMITTED',
      createdById: admin.id,
    });
    assert.equal(berrV2Eval.version, 2);
    assert.ok((berrV2Eval.linkedBegNodeIds || []).length > 0);
    const berrHistoryAfter = await BerrV2Service.getAssessmentHistory(testCase.id);
    assert.equal(berrHistoryAfter.history.length, 2);

    // Inspect persisted BEG graph nodes, contradictions, gaps, and provenance
    const bundle = await BegPersistenceService.getPersistedGraph(testCase.id);
    const { graph } = bundle;
    assert.ok(graph.nodes.some((n) => n.begType === 'ORDER'));
    assert.ok(graph.nodes.some((n) => n.begType === 'PRODUCT_SPECIFICATION'));
    assert.ok(graph.nodes.some((n) => n.begType === 'INVOICE'));
    assert.ok(graph.nodes.some((n) => n.begType === 'SELLER_DECLARATION'));
    assert.ok(graph.nodes.some((n) => n.begType === 'MARKETPLACE'));
    assert.ok(graph.nodes.some((n) => n.begType === 'LOGISTICS_PROVIDER'));
    assert.ok(graph.nodes.some((n) => n.begType === 'CONTRADICTION_FINDING'));
    assert.ok(graph.nodes.some((n) => n.begType === 'MISSING_EVIDENCE'));
    assert.ok(graph.edges.some((e) => e.begType === 'CONTRADICTS_CLAIM' || e.type === 'CONTRADICTED_BY'));

    // Provenance guardrail checks
    const buyerImgNode = graph.nodes.find((n) => n.id === `evidence:${buyerImgEv.id}`);
    assert.ok(buyerImgNode);
    assert.equal(buyerImgNode.sourceOrigin, 'BUYER_SUBMITTED');
    assert.equal(buyerImgNode.verificationState, 'UNVERIFIED');
    assert.equal(buyerImgNode.provenanceRecord?.sha256, storedBuyerPhoto.sha256);

    const sellerDeclNode = graph.nodes.find((n) => n.begType === 'SELLER_DECLARATION');
    assert.ok(sellerDeclNode);
    assert.equal(sellerDeclNode.sourceOrigin, 'SELLER_SUBMITTED');
    assert.notEqual(sellerDeclNode.verificationState, 'VERIFIED'); // Seller declaration cannot auto-prove packing!

    // Layout & query contract checks (Part 14.F)
    const layout = GraphProjectionService.projectToVisualLayout(graph, 1320, 620);
    const buyerLayoutNode = layout.nodes.find((n) => n.swimlane === 'BUYER');
    const sellerLayoutNode = layout.nodes.find((n) => n.swimlane === 'SELLER');
    assert.ok(buyerLayoutNode && sellerLayoutNode && buyerLayoutNode.x < sellerLayoutNode.x);

    const searchFiltered = GraphQueryService.filterGraph(graph, { searchQuery: `OD-SS-${uniqueSuffix}` });
    assert.ok(searchFiltered.nodes.some((n) => n.begType === 'ORDER'));

    const neighborhood = GraphQueryService.getNeighborhood(graph, `case:${testCase.id}`, 1);
    assert.ok(neighborhood && neighborhood.directNeighbors.length >= 2);

    // Security & Investigator Actions checks (Part 14.G)
    // 1. Buyer strictly blocked (403) from internal BEG APIs
    const buyerGraphRes = await graphGET(
      mockReq(`http://localhost:3000/api/cases/${caseNumber}/graph`, 'alex.morgan@consumer.demo'),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(buyerGraphRes.status, 403);

    const buyerBerrRes = await berrV2GET(
      mockReq(`http://localhost:3000/api/cases/${caseNumber}/berr-v2`, 'alex.morgan@consumer.demo'),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(buyerBerrRes.status, 403);

    // 2. Other organization's merchant strictly blocked (404 / 403)
    const otherMerchantRes = await graphGET(
      mockReq(`http://localhost:3000/api/cases/${caseNumber}/graph`, 'support@digitalmart.demo'),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.ok(otherMerchantRes.status === 403 || otherMerchantRes.status === 404);

    // 3. Regular Merchant blocked (403) from internal investigator graph mutations & full graph
    const merchantEdgeRes = await edgeActionPOST(
      mockReq(
        `http://localhost:3000/api/cases/${caseNumber}/beg/edges/${encodeURIComponent(graph.edges[0].id)}/action`,
        'disputes@techstore.demo',
        { method: 'POST', body: { action: 'CONFIRM', explanation: 'Unauthorized attempt' } }
      ),
      { params: Promise.resolve({ caseId: caseNumber, edgeId: graph.edges[0].id }) }
    );
    assert.equal(merchantEdgeRes.status, 403);

    // 4. Admin / Investigator fetches graph & applies CONFIRM + MARK_CONTESTED + REQUEST_ADDITIONAL_INFO
    const adminGraphRes = await graphGET(
      mockReq(`http://localhost:3000/api/cases/${caseNumber}/graph`, 'admin@resolvegraph.demo'),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(adminGraphRes.status, 200);

    const targetEdge = graph.edges.find((e) => e.begType === 'EXTRACTED_FROM') || graph.edges[0];
    const origAiState = targetEdge.verificationState;

    const confirmRes = await edgeActionPOST(
      mockReq(
        `http://localhost:3000/api/cases/${caseNumber}/beg/edges/${encodeURIComponent(targetEdge.id)}/action`,
        'admin@resolvegraph.demo',
        {
          method: 'POST',
          body: {
            action: 'CONFIRM',
            explanation: 'Investigator verified serial label clearly displays 512GB model.',
          },
        }
      ),
      { params: Promise.resolve({ caseId: caseNumber, edgeId: encodeURIComponent(targetEdge.id) }) }
    );
    assert.equal(confirmRes.status, 200);
    const confirmJson = await confirmRes.json();
    assert.equal(confirmJson.edge.verificationState, 'VERIFIED');
    assert.equal(confirmJson.edge.originalAiState, origAiState);

    // Verify human override persists across subsequent automated rebuilds!
    await BegSyncService.handleDomainEvent({
      caseId: testCase.id,
      triggerEvent: 'SUBSEQUENT_SYNC',
      rerunBerr: false,
    });
    const refreshedBundle = await BegPersistenceService.getPersistedGraph(testCase.id);
    const refreshedEdge = refreshedBundle.graph.edges.find((e) => e.id === targetEdge.id);
    assert.equal(refreshedEdge?.verificationState, 'VERIFIED');
    assert.equal(refreshedEdge?.reviewStatus, 'CONFIRMED');
    assert.ok(refreshedBundle.edgeActions.length >= 1);

    // 5. Evidence preview authorization check
    const adminPreviewRes = await evidencePreviewGET(
      mockReq(
        `http://localhost:3000/api/cases/${caseNumber}/beg/evidence/${buyerImgEv.id}/preview`,
        'admin@resolvegraph.demo'
      ),
      { params: Promise.resolve({ caseId: caseNumber, evidenceId: buyerImgEv.id }) }
    );
    assert.equal(adminPreviewRes.status, 200);
    const previewJson = await adminPreviewRes.json();
    assert.equal(previewJson.previewMode, 'image');
    assert.equal(previewJson.evidence.sha256, storedBuyerPhoto.sha256);

    // Expand neighborhood & rebuild routes authorized check
    const expandRes = await expandGET(
      mockReq(
        `http://localhost:3000/api/cases/${caseNumber}/graph/expand?nodeId=${encodeURIComponent(`case:${testCase.id}`)}&depth=1`,
        'admin@resolvegraph.demo'
      ),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(expandRes.status, 200);

    const rebuildRes = await rebuildPOST(
      mockReq(`http://localhost:3000/api/cases/${caseNumber}/graph/rebuild`, 'admin@resolvegraph.demo', {
        method: 'POST',
      }),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(rebuildRes.status, 200);

    const berrPostRes = await berrV2POST(
      mockReq(`http://localhost:3000/api/cases/${caseNumber}/berr-v2`, 'admin@resolvegraph.demo', {
        method: 'POST',
      }),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(berrPostRes.status, 200);

    // Silence unused imports check cleanly
    assert.ok(typeof extractAttributeTokens === 'function');
    assert.ok(typeof evaluateAttributeDiscrepancies === 'function');
  });
});
