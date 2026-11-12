import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
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
import { GET as listSellerRequests } from '@/app/api/seller/requests/route';
import { GET as getSellerRequestDetail } from '@/app/api/seller/requests/[requestId]/route';
import { POST as respondToSellerRequest } from '@/app/api/seller/requests/[requestId]/respond/route';
import { POST as followUpSellerRequest } from '@/app/api/seller/requests/[requestId]/follow-up/route';
import {
  GET as listSellerDirectory,
  POST as createSellerDirectory,
} from '@/app/api/seller/directory/route';
import { PATCH as verifySellerDirectory } from '@/app/api/seller/directory/[sellerId]/route';
import { GET as getCaseSellerWorkflow } from '@/app/api/cases/[caseId]/seller-workflow/route';
import { POST as reportBuyerHelpCentreOutreach } from '@/app/api/complaints/[caseId]/seller-outreach/route';
import { SellerWorkflowOrchestrator } from '@/server/seller';

function makeNextReq(
  url: string,
  options?: { method?: string; email?: string; jsonBody?: unknown }
) {
  const headers = new Headers();
  if (options?.email) headers.set('x-demo-user-email', options.email);
  if (options?.jsonBody !== undefined) headers.set('content-type', 'application/json');

  return new NextRequest(url, {
    method: options?.method || 'GET',
    headers,
    ...(options?.jsonBody !== undefined ? { body: JSON.stringify(options.jsonBody) } : {}),
  });
}

test('HTTP API Route Handlers enforce auth, cross-tenant seller isolation, response verification, directory & Help Centre confirmation', async () => {
  const suffix = Date.now();
  const [buyer, admin] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } }),
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } }),
  ]);

  const casePortal = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-API-PORTAL-${suffix}`,
      title: 'API Registered Seller Test Case',
      description: 'Order ID: ORD-API-1001. Phone 9988776655',
      category: CaseCategory.DAMAGED_GOODS,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 499900,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
      organizationId: null,
    },
  });

  const evPortal = await prisma.evidence.create({
    data: {
      caseId: casePortal.id,
      uploadedById: buyer.id,
      filename: 'techstore-order-invoice.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1500,
      storageKey: 'unused.pdf',
      sha256: `api-p-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });
  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: evPortal.id,
      assessmentState: 'REQUIRES_REVIEW',
      confidence: 0.9,
      findingsSummary: 'Clean file',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  // Unregistered Seller case for Help Centre route
  const caseHelp = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-API-HELP-${suffix}`,
      title: 'API Unregistered Flipkart Seller',
      description: 'Order ID: OD9000011122233344',
      category: CaseCategory.NOT_AS_DESCRIBED,
      status: CaseStatus.SUBMITTED,
      stage: CaseStage.EVIDENCE_GATHERING,
      amountMinor: 199900,
      currency: 'INR',
      buyerId: buyer.id,
      merchantId: admin.id,
      organizationId: null,
    },
  });
  const evHelp = await prisma.evidence.create({
    data: {
      caseId: caseHelp.id,
      uploadedById: buyer.id,
      filename: 'flipkart-thirdparty.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1200,
      storageKey: 'unused2.pdf',
      sha256: `api-h-${suffix}`,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.UNVERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });
  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: evHelp.id,
      assessmentState: 'REQUIRES_REVIEW',
      confidence: 0.9,
      findingsSummary: 'Clean file',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  const token36 = suffix.toString(36).toUpperCase();
  const unregGstin = `29UNAPI${String(suffix).slice(-4).padStart(4, '0')}A1Z5`;
  const createdDirectoryIds: string[] = [];
  const createdStorageKeys: string[] = [];

  try {
    const wfPortal = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: casePortal.id,
      actorId: buyer.id,
      marketplaceHint: 'DIRECT',
      orderIdHint: 'ORD-API-1001',
      productNameHint: 'SSD Pro',
      inMemoryDocuments: [
        {
          evidenceId: evPortal.id,
          filename: evPortal.filename,
          mimeType: 'application/pdf',
          rawText:
            'Sold By: TechStore Retail Private Limited\nSeller GSTIN: 29AABCT1234E1Z5\nOrder ID: ORD-API-1001',
        },
      ],
    });
    const requestId = wfPortal.gatewayResult?.requestId;
    assert.ok(requestId);

    const wfHelp = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: caseHelp.id,
      actorId: buyer.id,
      marketplaceHint: 'Flipkart',
      orderIdHint: 'OD9000011122233344',
      productNameHint: 'Wireless Mouse',
      inMemoryDocuments: [
        {
          evidenceId: evHelp.id,
          filename: evHelp.filename,
          mimeType: 'application/pdf',
          rawText: `Sold By: ThirdParty_${token36} Gadgets Pvt Ltd\nSeller GSTIN: ${unregGstin}\nOrder ID: OD9000011122233344`,
        },
      ],
    });
    assert.equal(wfHelp.gatewayResult?.selectedChannel, 'CUSTOMER_ASSISTED_HELP_CENTRE');

    // 1. Unauthenticated & Buyer blocked from seller portal API
    const unauthRes = await listSellerRequests(makeNextReq('http://localhost/api/seller/requests'));
    assert.equal(unauthRes.status, 401);

    const buyerRes = await listSellerRequests(
      makeNextReq('http://localhost/api/seller/requests', { email: 'alex.morgan@consumer.demo' })
    );
    assert.equal(buyerRes.status, 403);

    // 2. DigitalMart merchant blocked from TechStore request
    const dmList = await listSellerRequests(
      makeNextReq('http://localhost/api/seller/requests', { email: 'support@digitalmart.demo' })
    );
    assert.equal(dmList.status, 200);
    const dmJson = await dmList.json();
    assert.equal(dmJson.requests.some((r: { id: string }) => r.id === requestId), false);

    const dmDetail = await getSellerRequestDetail(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}`, {
        email: 'support@digitalmart.demo',
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(dmDetail.status, 403);

    // 3. TechStore merchant opens detail -> 200 & sets VIEWED
    const tsDetail = await getSellerRequestDetail(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}`, {
        email: 'disputes@techstore.demo',
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(tsDetail.status, 200);
    const tsDetailJson = await tsDetail.json();
    assert.equal(tsDetailJson.request.status, 'VIEWED');

    // 4. TechStore submits JSON response with base64 PDF file via API route
    const pdfBase64 = Buffer.from(
      '%PDF-1.4\nBT (Dispatch Order ORD-API-1001 SSD Pro 4999.00 2026-10-05) Tj ET\n%%EOF'
    ).toString('base64');

    const respondRes = await respondToSellerRequest(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}/respond`, {
        method: 'POST',
        email: 'disputes@techstore.demo',
        jsonBody: {
          stance: 'DISAGREE',
          summary: 'Dispatched undamaged unit inspected prior to sealing.',
          declarationConfirmed: true,
          idempotencyKey: `api-resp-${suffix}`,
          itemResponses: [
            { key: 'dispatch_information', status: 'PROVIDED', note: 'AWB-API-9988' },
            { key: 'pre_pack_condition_photo', status: 'NOT_AVAILABLE', note: 'Bench camera offline' },
          ],
          files: [
            {
              filename: 'awb-dispatch-proof.pdf',
              mimeType: 'application/pdf',
              contentBase64: pdfBase64,
              requestedItemKey: 'dispatch_information',
            },
          ],
        },
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(respondRes.status, 201);
    const respondJson = await respondRes.json();
    assert.equal(respondJson.success, true);
    assert.equal(respondJson.response.uploadedEvidenceIds.length, 1);

    const uploadedRows = await prisma.evidence.findMany({
      where: { id: { in: respondJson.response.uploadedEvidenceIds } },
      select: { storageKey: true },
    });
    createdStorageKeys.push(...uploadedRows.map((u) => u.storageKey));

    // 5. Case seller-workflow API returns matching screening, match, request & response
    const wfApiRes = await getCaseSellerWorkflow(
      makeNextReq(`http://localhost/api/cases/${casePortal.caseNumber}/seller-workflow`, {
        email: 'admin@resolvegraph.demo',
      }),
      { params: Promise.resolve({ caseId: casePortal.caseNumber }) }
    );
    assert.equal(wfApiRes.status, 200);
    const wfApiJson = await wfApiRes.json();
    assert.equal(wfApiJson.requests[0].responses.length, 1);

    // 6. Merchant cannot run admin follow-up; admin can
    const merchFollowRes = await followUpSellerRequest(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}/follow-up`, {
        method: 'POST',
        email: 'disputes@techstore.demo',
        jsonBody: { action: 'FOLLOW_UP' },
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(merchFollowRes.status, 403);

    const adminFollowRes = await followUpSellerRequest(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}/follow-up`, {
        method: 'POST',
        email: 'admin@resolvegraph.demo',
        jsonBody: { action: 'FOLLOW_UP', message: 'Check serial number.' },
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(adminFollowRes.status, 200);

    // 7. Seller Directory API access control & CRUD
    const merchDirRes = await listSellerDirectory(
      makeNextReq('http://localhost/api/seller/directory', { email: 'disputes@techstore.demo' })
    );
    assert.equal(merchDirRes.status, 403);

    const createDirRes = await createSellerDirectory(
      makeNextReq('http://localhost/api/seller/directory', {
        method: 'POST',
        email: 'admin@resolvegraph.demo',
        jsonBody: {
          legalName: `API Test Vendor ${token36} Pvt Ltd`,
          gstin: `27APIVD${String(suffix).slice(-4).padStart(4, '0')}B1Z3`,
          state: 'Maharashtra',
          marketplace: 'AMAZON',
        },
      })
    );
    assert.equal(createDirRes.status, 201);
    const createdDirJson = await createDirRes.json();
    createdDirectoryIds.push(createdDirJson.seller.id);

    const verifyDirRes = await verifySellerDirectory(
      makeNextReq(`http://localhost/api/seller/directory/${createdDirJson.seller.id}`, {
        method: 'PATCH',
        email: 'admin@resolvegraph.demo',
        jsonBody: { verificationStatus: 'VERIFIED', linkedOrganizationId: 'org_digitalmart' },
      }),
      { params: Promise.resolve({ sellerId: createdDirJson.seller.id }) }
    );
    assert.equal(verifyDirRes.status, 200);
    const verifyDirJson = await verifyDirRes.json();
    assert.equal(verifyDirJson.seller.registrationStatus, 'REGISTERED');

    // 8. Buyer reports Help Centre submission on unregistered marketplace case
    const buyerOutreachRes = await reportBuyerHelpCentreOutreach(
      makeNextReq(`http://localhost/api/complaints/${caseHelp.caseNumber}/seller-outreach`, {
        method: 'POST',
        email: 'alex.morgan@consumer.demo',
        jsonBody: { ticketReference: `FK-API-${suffix}` },
      }),
      { params: Promise.resolve({ caseId: caseHelp.caseNumber }) }
    );
    assert.equal(buyerOutreachRes.status, 200);
    const buyerOutreachJson = await buyerOutreachRes.json();
    assert.equal(buyerOutreachJson.request.status, 'MARKETPLACE_SUPPORT_PENDING');
  } finally {
    const linkedReqs = await prisma.sellerEvidenceRequest.findMany({
      where: { caseId: { in: [casePortal.id, caseHelp.id] }, sellerId: { not: null } },
      select: { sellerId: true },
    });
    const linkedSellerIds = linkedReqs.map((r) => r.sellerId).filter((id): id is string => Boolean(id));
    await prisma.caseRecord.deleteMany({
      where: { id: { in: [casePortal.id, caseHelp.id] } },
    });
    await prisma.sellerDirectoryEntry.deleteMany({
      where: {
        OR: [
          { gstin: unregGstin },
          ...(createdDirectoryIds.length ? [{ id: { in: createdDirectoryIds } }] : []),
          ...(linkedSellerIds.length
            ? [{ id: { in: linkedSellerIds }, linkedOrganizationId: null }]
            : []),
        ],
      },
    });
    for (const sk of createdStorageKeys) {
      const fullPath = path.isAbsolute(sk)
        ? sk
        : path.resolve(process.cwd(), process.env.EVIDENCE_STORAGE_DIR || './.private/evidence', sk);
      await fs.unlink(fullPath).catch(() => {});
    }
  }
});
