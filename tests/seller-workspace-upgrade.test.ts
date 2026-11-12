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
  OrganizationRole,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/client';
import {
  SellerEvidenceRequirementsService,
  SellerWorkflowOrchestrator,
} from '@/server/seller';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { GET as listSellerRequests } from '@/app/api/seller/requests/route';
import {
  GET as getSellerRequestDetail,
  PATCH as saveSellerRequestDraft,
} from '@/app/api/seller/requests/[requestId]/route';
import { POST as respondToSellerRequest } from '@/app/api/seller/requests/[requestId]/respond/route';
import { GET as listSellerResponses } from '@/app/api/seller/responses/route';
import { GET as getSellerResponseDetail } from '@/app/api/seller/responses/[responseId]/route';
import {
  GET as getSellerProfile,
  PATCH as patchSellerProfile,
} from '@/app/api/seller/profile/route';
import { GET as downloadEvidence } from '@/app/api/evidence/[evidenceId]/download/route';

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

test('Seller dynamic form config adapts Step 2 & Step 3 fields cleanly per complaint category', () => {
  const wrongProduct = SellerEvidenceRequirementsService.getDynamicFormConfig({
    category: CaseCategory.NOT_AS_DESCRIBED,
    originalCategory: 'WRONG_PRODUCT',
    productName: 'Sony WH-1000XM5 Headphones',
  });
  assert.equal(wrongProduct.categoryKey, 'WRONG_PRODUCT');
  assert.ok(wrongProduct.step2Fields.some((f) => f.key === 'sku'));
  assert.ok(wrongProduct.step2Fields.some((f) => f.key === 'packingProcessInfo'));
  assert.ok(wrongProduct.step3Fields.some((f) => f.key === 'logisticsProvider'));

  const damaged = SellerEvidenceRequirementsService.getDynamicFormConfig({
    category: CaseCategory.DAMAGED_GOODS,
    originalCategory: 'DAMAGED_PRODUCT',
    productName: 'Ceramic Espresso Mug Set',
  });
  assert.equal(damaged.categoryKey, 'DAMAGED_PRODUCT');
  assert.ok(damaged.step2Fields.some((f) => f.key === 'productConditionBeforePacking'));
  assert.ok(damaged.step2Fields.some((f) => f.key === 'qualityInspectionCompleted'));

  const missingItem = SellerEvidenceRequirementsService.getDynamicFormConfig({
    category: CaseCategory.NON_DELIVERY,
    originalCategory: 'MISSING_ITEM',
    productName: 'Cordless Drill Kit',
  });
  assert.equal(missingItem.categoryKey, 'MISSING_ITEM');
  assert.ok(missingItem.step2Fields.some((f) => f.key === 'quantityPacked'));
  assert.ok(missingItem.step3Fields.some((f) => f.key === 'packageWeight'));

  const specsDiffer = SellerEvidenceRequirementsService.getDynamicFormConfig({
    category: CaseCategory.NOT_AS_DESCRIBED,
    originalCategory: 'SPECS_DIFFER',
    productName: 'USB-C Monitor',
  });
  assert.equal(specsDiffer.categoryKey, 'SPECS_DIFFER');
  assert.ok(specsDiffer.step2Fields.some((f) => f.key === 'productModel'));
  assert.ok(specsDiffer.step2Fields.some((f) => f.key === 'productSpecifications'));

  const paymentProblem = SellerEvidenceRequirementsService.getDynamicFormConfig({
    category: CaseCategory.BILLING_ERROR,
    originalCategory: 'PAYMENT_PROBLEM',
    productName: 'Cloud Subscription Plan',
  });
  assert.equal(paymentProblem.categoryKey, 'PAYMENT_PROBLEM');
  assert.ok(paymentProblem.step2Fields.some((f) => f.key === 'merchantPaymentRef'));
  assert.ok(paymentProblem.step3Fields.some((f) => f.key === 'settlementReference'));
  assert.equal(
    paymentProblem.step2Fields.some((f) => f.key === 'packingProcessInfo'),
    false,
    'Payment complaints must not ask for product packing fields'
  );
  assert.equal(
    paymentProblem.step3Fields.some((f) => f.key === 'logisticsProvider'),
    false,
    'Payment complaints must not ask for courier dispatch fields'
  );

  const refundProblem = SellerEvidenceRequirementsService.getDynamicFormConfig({
    category: CaseCategory.REFUND_DISPUTE,
    originalCategory: 'REFUND_NOT_RECEIVED',
    productName: 'Smartwatch Band',
  });
  assert.equal(refundProblem.categoryKey, 'REFUND_NOT_RECEIVED');
  assert.ok(refundProblem.step2Fields.some((f) => f.key === 'originalPaymentRef'));
  assert.ok(refundProblem.step3Fields.some((f) => f.key === 'providerConfirmationRef'));
});

test('Seller Workspace lifecycle: In-Progress draft, KPI summary, structured submission, supplemental thread, notifications, and ?inline=1 security', async () => {
  const suffix = Date.now();
  const [buyer, admin] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } }),
    prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } }),
  ]);

  const testCase = await prisma.caseRecord.create({
    data: {
      caseNumber: `RG-UPGRADE-${suffix}`,
      title: 'Seller Upgrade Flow Test Complaint',
      description: `Order ID: ORD-UPG-${suffix}. Product mismatch reported by customer.`,
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

  const pdfBuffer = Buffer.from(
    `%PDF-1.4\n1 0 obj <<>> endobj\nBT (TechStore Retail Pvt Ltd Invoice Order ORD-UPG-${suffix}) Tj ET\n%%EOF`,
    'utf8'
  );
  const storedFile = await evidenceStorage.saveFile(
    pdfBuffer,
    `buyer-invoice-${suffix}.pdf`,
    'application/pdf'
  );

  const buyerEvidence = await prisma.evidence.create({
    data: {
      caseId: testCase.id,
      uploadedById: buyer.id,
      filename: `buyer-invoice-${suffix}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: pdfBuffer.length,
      storageKey: storedFile.storageKey,
      sha256: storedFile.sha256,
      evidenceType: EvidenceType.INVOICE,
      sourceType: EvidenceSource.BUYER_UPLOAD,
      verificationStatus: VerificationStatus.VERIFIED,
      visibility: EvidenceVisibility.SHARED_WITH_PARTICIPANTS,
      scanStatus: MalwareScanStatus.CLEAN,
    },
  });

  await prisma.evidenceAnalysisResult.create({
    data: {
      evidenceId: buyerEvidence.id,
      assessmentState: 'SUFFICIENT',
      confidence: 0.94,
      findingsSummary: 'Clear invoice PDF',
      humanReviewRecommended: false,
      analysisMethod: 'TEST',
    },
  });

  const createdStorageKeys: string[] = [storedFile.storageKey];
  const createdNotificationIds: string[] = [];

  try {
    const orchestration = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: testCase.id,
      actorId: buyer.id,
      marketplaceHint: 'AMAZON',
      orderIdHint: `ORD-UPG-${suffix}`,
      productNameHint: 'Mechanical Keyboard K8',
      inMemoryDocuments: [
        {
          evidenceId: buyerEvidence.id,
          filename: buyerEvidence.filename,
          mimeType: 'application/pdf',
          rawText: `Sold By: TechStore Retail Pvt Ltd\nSeller GSTIN: 29AABCT1234E1Z5\nOrder ID: ORD-UPG-${suffix}\nAmazon`,
        },
      ],
    });

    const requestId = orchestration.gatewayResult?.requestId;
    assert.ok(requestId, 'Expected portal SellerEvidenceRequest to be created');
    assert.equal(
      orchestration.gatewayResult?.selectedChannel,
      'SELLER_PORTAL',
      `Unexpected channel: ${JSON.stringify(orchestration.gatewayResult)}`
    );

    // 1. Before opening or drafting, dashboard lists this under New Requests & ?status=NEW
    const initialListRes = await listSellerRequests(
      makeNextReq(`http://localhost/api/seller/requests?status=NEW&q=ORD-UPG-${suffix}`, {
        email: 'disputes@techstore.demo',
      })
    );
    assert.equal(initialListRes.status, 200);
    const initialListJson = await initialListRes.json();
    assert.equal(
      initialListJson.requests.length,
      1,
      `Expected 1 request matching ORD-UPG-${suffix}; got ${JSON.stringify(initialListJson)}`
    );
    assert.equal(initialListJson.requests[0].statusLabel, 'New Request');
    assert.ok(initialListJson.summary.newRequests >= 1);

    // 2. Detail includes clean narrative, dynamicFormConfig, and previewUrl ending with ?inline=1
    const detailRes = await getSellerRequestDetail(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}`, {
        email: 'disputes@techstore.demo',
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(detailRes.status, 200);
    const detailJson = await detailRes.json();
    assert.ok(detailJson.request.dynamicFormConfig);
    assert.ok(detailJson.request.customerComplaint.sharedBuyerEvidence.length >= 1);
    assert.ok(
      detailJson.request.customerComplaint.sharedBuyerEvidence[0].previewUrl.endsWith('?inline=1')
    );

    // 3. Authenticated inline evidence download enforces org isolation
    const buyerPreviewUnauth = await downloadEvidence(
      makeNextReq(`http://localhost/api/evidence/${buyerEvidence.id}/download?inline=1`),
      { params: Promise.resolve({ evidenceId: buyerEvidence.id }) }
    );
    assert.equal(buyerPreviewUnauth.status, 401);

    const otherOrgPreview = await downloadEvidence(
      makeNextReq(`http://localhost/api/evidence/${buyerEvidence.id}/download?inline=1`, {
        email: 'support@digitalmart.demo',
      }),
      { params: Promise.resolve({ evidenceId: buyerEvidence.id }) }
    );
    assert.equal(otherOrgPreview.status, 403);

    const sellerPreviewOk = await downloadEvidence(
      makeNextReq(`http://localhost/api/evidence/${buyerEvidence.id}/download?inline=1`, {
        email: 'disputes@techstore.demo',
      }),
      { params: Promise.resolve({ evidenceId: buyerEvidence.id }) }
    );
    assert.equal(sellerPreviewOk.status, 200);
    assert.match(
      sellerPreviewOk.headers.get('content-disposition') || '',
      /^inline;/i
    );

    // 4. Saving draft moves request into In Progress bucket & persists draft payload
    const saveDraftRes = await saveSellerRequestDraft(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}`, {
        method: 'PATCH',
        email: 'disputes@techstore.demo',
        jsonBody: {
          draft: {
            stance: 'DISAGREE',
            summary: 'Checking warehouse barcode scan logs before final response.',
            currentStep: 2,
            itemResponses: [{ key: 'dispatch_proof', status: 'PROVIDED' }],
            structuredDetails: {
              productAndPacking: { sku: 'K8-RED-01', productName: 'Mechanical Keyboard K8' },
            },
          },
        },
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(saveDraftRes.status, 200);
    const saveDraftJson = await saveDraftRes.json();
    assert.equal(saveDraftJson.status, 'IN_PROGRESS');

    const inProgressListRes = await listSellerRequests(
      makeNextReq(`http://localhost/api/seller/requests?status=IN_PROGRESS&q=ORD-UPG-${suffix}`, {
        email: 'disputes@techstore.demo',
      })
    );
    assert.equal(inProgressListRes.status, 200);
    const inProgressJson = await inProgressListRes.json();
    assert.equal(inProgressJson.requests.length, 1);
    assert.equal(inProgressJson.requests[0].hasDraft, true);
    assert.equal(inProgressJson.requests[0].statusLabel, 'In Progress');

    // 5. Submitting initial response persists structuredDetails & emits /seller/responses/[id] notification
    const submit1Res = await respondToSellerRequest(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}/respond`, {
        method: 'POST',
        email: 'disputes@techstore.demo',
        jsonBody: {
          stance: 'DISAGREE',
          summary: `Exact SKU K8-RED-01 dispatched for order ORD-UPG-${suffix} with tamper seal.`,
          declarationConfirmed: true,
          structuredDetails: {
            productAndPacking: {
              sku: 'K8-RED-01',
              productName: 'Mechanical Keyboard K8',
              quantityPacked: '1',
            },
            dispatchAndSettlement: {
              logisticsProvider: 'BlueDart',
              trackingId: `BD-${suffix}`,
            },
          },
          itemResponses: [{ key: 'packing_proof', status: 'PROVIDED' }],
        },
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(submit1Res.status, 201);
    const submit1Json = await submit1Res.json();
    const response1Id = submit1Json.response.responseId as string;

    const notifRows = await prisma.notificationMessage.findMany({
      where: {
        userId: 'usr_techstore_merchant',
        linkUrl: `/seller/responses/${response1Id}`,
      },
    });
    assert.ok(notifRows.length >= 1, 'Expected seller notification linking to /seller/responses/[id]');
    createdNotificationIds.push(...notifRows.map((n) => n.id));

    // 6. Submitting supplemental response creates a second preserved record without overwriting #1
    const submit2Res = await respondToSellerRequest(
      makeNextReq(`http://localhost/api/seller/requests/${requestId}/respond`, {
        method: 'POST',
        email: 'disputes@techstore.demo',
        jsonBody: {
          stance: 'CLARIFICATION_ONLY',
          summary: `Supplemental warehouse bin scan timestamp added for ORD-UPG-${suffix}.`,
          declarationConfirmed: true,
          itemResponses: [],
        },
      }),
      { params: Promise.resolve({ requestId }) }
    );
    assert.equal(submit2Res.status, 201);
    const submit2Json = await submit2Res.json();
    const response2Id = submit2Json.response.responseId as string;
    assert.notEqual(response1Id, response2Id);

    const extraNotifs = await prisma.notificationMessage.findMany({
      where: { linkUrl: `/seller/responses/${response2Id}` },
    });
    createdNotificationIds.push(...extraNotifs.map((n) => n.id));

    // 7. GET /api/seller/responses & GET /api/seller/responses/[id] reflect preserved history
    const responsesListRes = await listSellerResponses(
      makeNextReq(`http://localhost/api/seller/responses?q=ORD-UPG-${suffix}`, {
        email: 'disputes@techstore.demo',
      })
    );
    assert.equal(responsesListRes.status, 200);
    const responsesListJson = await responsesListRes.json();
    assert.equal(responsesListJson.responses.length, 2);

    const responseDetailRes = await getSellerResponseDetail(
      makeNextReq(`http://localhost/api/seller/responses/${response1Id}`, {
        email: 'disputes@techstore.demo',
      }),
      { params: Promise.resolve({ responseId: response1Id }) }
    );
    assert.equal(responseDetailRes.status, 200);
    const responseDetailJson = await responseDetailRes.json();
    assert.equal(responseDetailJson.response.structuredDetails.productAndPacking.sku, 'K8-RED-01');
    assert.equal(responseDetailJson.response.structuredDetails.dispatchAndSettlement.trackingId, `BD-${suffix}`);
    assert.equal(responseDetailJson.response.threadResponses.length, 2);

    // Other org cannot access response detail
    const crossOrgRespRes = await getSellerResponseDetail(
      makeNextReq(`http://localhost/api/seller/responses/${response1Id}`, {
        email: 'support@digitalmart.demo',
      }),
      { params: Promise.resolve({ responseId: response1Id }) }
    );
    assert.equal(crossOrgRespRes.status, 403);
  } finally {
    if (createdNotificationIds.length > 0) {
      await prisma.notificationMessage
        .deleteMany({ where: { id: { in: createdNotificationIds } } })
        .catch(() => {});
    }
    await prisma.caseRecord
      .deleteMany({ where: { id: testCase.id } })
      .catch(() => {});
    for (const sk of createdStorageKeys) {
      const fullPath = path.isAbsolute(sk)
        ? sk
        : path.resolve(process.cwd(), process.env.EVIDENCE_STORAGE_DIR || './.private/evidence', sk);
      await fs.unlink(fullPath).catch(() => {});
    }
  }
});

test('Seller Business Profile enforces org RBAC and triggers VERIFICATION_PENDING on legalName/GSTIN changes', async () => {
  const suffix = Date.now();
  const org = await prisma.organization.create({
    data: {
      name: `Profile Test Org ${suffix}`,
      slug: `profile-test-org-${suffix}`,
      isActive: true,
    },
  });

  const ownerEmail = `owner.profile.${suffix}@merchant.demo`;
  const agentEmail = `agent.profile.${suffix}@merchant.demo`;
  const viewerEmail = `viewer.profile.${suffix}@merchant.demo`;

  const [ownerUser, agentUser, viewerUser] = await Promise.all([
    prisma.user.create({
      data: {
        email: ownerEmail,
        fullName: 'Owner Test',
        role: UserRole.MERCHANT,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: agentEmail,
        fullName: 'Agent Test',
        role: UserRole.MERCHANT,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: viewerEmail,
        fullName: 'Viewer Test',
        role: UserRole.MERCHANT,
        isActive: true,
      },
    }),
  ]);

  await prisma.organizationMember.createMany({
    data: [
      { organizationId: org.id, userId: ownerUser.id, role: OrganizationRole.OWNER, isActive: true },
      { organizationId: org.id, userId: agentUser.id, role: OrganizationRole.MERCHANT_AGENT, isActive: true },
      { organizationId: org.id, userId: viewerUser.id, role: OrganizationRole.VIEWER, isActive: true },
    ],
  });

  const dirEntry = await prisma.sellerDirectoryEntry.create({
    data: {
      legalName: `Original Seller Co ${suffix} Pvt Ltd`,
      normalizedLegalName: `original seller co ${suffix} private limited`,
      displayName: 'Original Store',
      gstin: `29ABCDE1234F1Z5`,
      state: 'Karnataka',
      identityStatus: 'VERIFIED',
      registrationStatus: 'REGISTERED',
      verificationStatus: 'VERIFIED',
      linkedOrganizationId: org.id,
      linkedMerchantUserId: ownerUser.id,
    },
  }).catch(async () => {
    // Fallback GSTIN uniqueness if previous crashed run left 29ABCDE1234F1Z5
    const randDigits = String(suffix).slice(-4);
    return prisma.sellerDirectoryEntry.create({
      data: {
        legalName: `Original Seller Co ${suffix} Pvt Ltd`,
        normalizedLegalName: `original seller co ${suffix} private limited`,
        displayName: 'Original Store',
        gstin: `29ABCDE${randDigits}F1Z5`,
        state: 'Karnataka',
        identityStatus: 'VERIFIED',
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        linkedOrganizationId: org.id,
        linkedMerchantUserId: ownerUser.id,
      },
    });
  });

  try {
    // 1. Buyer is forbidden from Seller Profile API
    const buyerRes = await getSellerProfile(
      makeNextReq('http://localhost/api/seller/profile', { email: 'alex.morgan@consumer.demo' })
    );
    assert.equal(buyerRes.status, 403);

    // 2. Owner can fetch full profile
    const ownerGet = await getSellerProfile(
      makeNextReq('http://localhost/api/seller/profile', { email: ownerEmail })
    );
    assert.equal(ownerGet.status, 200);
    const ownerProfileJson = await ownerGet.json();
    assert.equal(ownerProfileJson.profile.canEditIdentityFields, true);
    assert.equal(ownerProfileJson.profile.gstin, dirEntry.gstin);

    // 3. Viewer cannot modify anything
    const viewerPatch = await patchSellerProfile(
      makeNextReq('http://localhost/api/seller/profile', {
        method: 'PATCH',
        email: viewerEmail,
        jsonBody: { displayName: 'Blocked' },
      })
    );
    assert.equal(viewerPatch.status, 403);

    // 4. Merchant Agent can edit operational displayName but cannot change legalName
    const agentIllegalPatch = await patchSellerProfile(
      makeNextReq('http://localhost/api/seller/profile', {
        method: 'PATCH',
        email: agentEmail,
        jsonBody: { legalName: 'Hijacked Corp Ltd' },
      })
    );
    assert.equal(agentIllegalPatch.status, 403);

    const agentAllowedPatch = await patchSellerProfile(
      makeNextReq('http://localhost/api/seller/profile', {
        method: 'PATCH',
        email: agentEmail,
        jsonBody: { displayName: 'Updated Storefront Label', businessAddress: 'MG Road, Bengaluru' },
      })
    );
    assert.equal(agentAllowedPatch.status, 200);
    const agentAllowedJson = await agentAllowedPatch.json();
    assert.equal(agentAllowedJson.profile.displayName, 'Updated Storefront Label');
    assert.equal(agentAllowedJson.profile.verificationStatus, 'VERIFIED');

    // 5. Owner changing legalName + linking marketplace triggers VERIFICATION_PENDING
    const ownerReverifyPatch = await patchSellerProfile(
      makeNextReq('http://localhost/api/seller/profile', {
        method: 'PATCH',
        email: ownerEmail,
        jsonBody: {
          legalName: `Renamed Seller Co ${suffix} LLP`,
          marketplaceAccount: {
            marketplace: 'FLIPKART',
            storefrontName: 'Updated Flipkart Store',
            marketplaceSellerId: `FK-${suffix}`,
          },
        },
      })
    );
    assert.equal(ownerReverifyPatch.status, 200);
    const reverifiedJson = await ownerReverifyPatch.json();
    assert.equal(reverifiedJson.profile.verificationStatus, 'VERIFICATION_PENDING');
    assert.ok(reverifiedJson.profile.reverificationNotice);
    assert.equal(reverifiedJson.profile.marketplaceAccounts.length, 1);
    assert.equal(reverifiedJson.profile.marketplaceAccounts[0].marketplace, 'FLIPKART');
  } finally {
    await prisma.notificationMessage
      .deleteMany({ where: { body: { contains: `Renamed Seller Co ${suffix}` } } })
      .catch(() => {});
    await prisma.sellerDirectoryEntry
      .deleteMany({ where: { id: dirEntry.id } })
      .catch(() => {});
    await prisma.organizationMember
      .deleteMany({ where: { organizationId: org.id } })
      .catch(() => {});
    await prisma.user
      .deleteMany({ where: { id: { in: [ownerUser.id, agentUser.id, viewerUser.id] } } })
      .catch(() => {});
    await prisma.organization
      .deleteMany({ where: { id: org.id } })
      .catch(() => {});
  }
});
