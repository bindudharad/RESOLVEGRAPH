import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CaseCategory,
  CaseStage,
  CaseStatus,
  EventType,
  OrganizationRole,
  UserRole,
} from '@/generated/prisma/client';
import { evidenceStorage } from '@/server/storage/evidence-storage';
import { EVIDENCE_SLOTS_BY_CATEGORY } from '@/lib/buyer-complaint-config';
import {
  SellerEvidenceRequirementsService,
  SellerWorkflowOrchestrator,
} from '@/server/seller';
import { ProposalWorkflowService } from '@/server/resolution/proposal-workflow';
import { GET as getProfile, PATCH as patchProfile } from '@/app/api/profile/route';
import { GET as getUsers } from '@/app/api/users/route';
import { POST as createOrg } from '@/app/api/organizations/route';
import { POST as submitComplaint } from '@/app/api/complaints/submit/route';
import { POST as suggestTitle } from '@/app/api/complaints/suggest-title/route';
import { GET as getMyComplaints } from '@/app/api/complaints/my/route';
import { GET as getComplaintDetail } from '@/app/api/complaints/[caseId]/route';
import { POST as uploadFollowupEvidence } from '@/app/api/complaints/[caseId]/evidence/route';
import { POST as postOutreachSubmission } from '@/app/api/complaints/[caseId]/seller-outreach/route';
import { POST as respondToProposal } from '@/app/api/resolution-proposals/[proposalId]/respond/route';
import { GET as getSellerRequests } from '@/app/api/seller/requests/route';
import {
  GET as getSellerRequestDetail,
  PATCH as saveSellerDraft,
} from '@/app/api/seller/requests/[requestId]/route';
import { POST as respondSellerRequest } from '@/app/api/seller/requests/[requestId]/respond/route';
import { POST as followUpSellerRequest } from '@/app/api/seller/requests/[requestId]/follow-up/route';
import { GET as getSellerResponses } from '@/app/api/seller/responses/route';
import { GET as getSellerResponseDetail } from '@/app/api/seller/responses/[responseId]/route';
import {
  GET as getSellerProfile,
  PATCH as patchSellerProfile,
} from '@/app/api/seller/profile/route';
import { GET as downloadEvidence } from '@/app/api/evidence/[evidenceId]/download/route';
import { GET as getNotifications } from '@/app/api/notifications/route';
import { POST as readNotification } from '@/app/api/notifications/[id]/read/route';
import { POST as readAllNotifications } from '@/app/api/notifications/read-all/route';

function makeJsonReq(
  url: string,
  options?: { method?: string; email?: string; body?: unknown }
): NextRequest {
  const headers = new Headers();
  if (options?.email) headers.set('x-demo-user-email', options.email);
  if (options?.body !== undefined) headers.set('content-type', 'application/json');
  return new NextRequest(url, {
    method: options?.method || 'GET',
    headers,
    ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
}

function makeFormReq(
  url: string,
  formData: FormData,
  email?: string
): NextRequest {
  const headers = new Headers();
  if (email) headers.set('x-demo-user-email', email);
  return new NextRequest(url, {
    method: 'POST',
    headers,
    body: formData,
  });
}

function makePngBytes(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89,
  ]);
}

function makePdfBytes(textContent: string): Uint8Array<ArrayBuffer> {
  const escapedLines = textContent.split(/\r?\n/).map((line) =>
    line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  );
  const tjCommands = escapedLines
    .map((line, i) => `BT /F1 11 Tf 40 ${740 - i * 16} Td (${line}) Tj ET`)
    .join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(tjCommands, 'utf8')} >>\nstream\n${tjCommands}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Uint8Array.from(Buffer.from(pdf, 'utf8'));
}

function makeUniqueGstin(tag: string, suffix: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const c1 = letters[(suffix + tag.charCodeAt(0)) % 26];
  const c2 = letters[(Math.floor(suffix / 7) + tag.charCodeAt(1)) % 26];
  const d4 = String(suffix).slice(-4).padStart(4, '0');
  return `29${tag.slice(0, 3).toUpperCase()}${c1}${c2}${d4}E1Z5`;
}

describe('RESOLVEGRAPH — Complete 20-Scenario Buyer & Seller Workspace E2E Audit', { concurrency: 1 }, () => {
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];
  const createdCaseIds: string[] = [];
  const createdSellerDirIds: string[] = [];
  const createdPassportIds: string[] = [];
  const createdNotificationIds: string[] = [];
  const createdStorageKeys: string[] = [];

  after(async () => {
    for (const key of Array.from(new Set(createdStorageKeys))) {
      await evidenceStorage.deleteFile(key).catch(() => {});
    }
    if (createdNotificationIds.length > 0) {
      await prisma.notificationMessage
        .deleteMany({ where: { id: { in: createdNotificationIds } } })
        .catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.notificationMessage
        .deleteMany({ where: { userId: { in: createdUserIds } } })
        .catch(() => {});
      await prisma.securityAuditEvent
        .deleteMany({ where: { actorId: { in: createdUserIds } } })
        .catch(() => {});
    }
    if (createdPassportIds.length > 0) {
      await prisma.packagePassport
        .deleteMany({ where: { id: { in: createdPassportIds } } })
        .catch(() => {});
    }
    if (createdCaseIds.length > 0) {
      const [evs, linkedReqs, linkedMatches] = await Promise.all([
        prisma.evidence.findMany({
          where: { caseId: { in: createdCaseIds } },
          select: { storageKey: true },
        }),
        prisma.sellerEvidenceRequest.findMany({
          where: { caseId: { in: createdCaseIds }, sellerId: { not: null } },
          select: { sellerId: true },
        }),
        prisma.sellerIdentityMatch.findMany({
          where: { caseId: { in: createdCaseIds }, matchedSellerId: { not: null } },
          select: { matchedSellerId: true },
        }),
      ]);
      for (const r of linkedReqs) {
        if (r.sellerId) createdSellerDirIds.push(r.sellerId);
      }
      for (const m of linkedMatches) {
        if (m.matchedSellerId) createdSellerDirIds.push(m.matchedSellerId);
      }
      for (const e of evs) {
        await evidenceStorage.deleteFile(e.storageKey).catch(() => {});
      }
      await prisma.commerceOrder
        .deleteMany({ where: { caseId: { in: createdCaseIds } } })
        .catch(() => {});
      await prisma.caseRecord
        .deleteMany({ where: { id: { in: createdCaseIds } } })
        .catch(() => {});
    }
    if (createdSellerDirIds.length > 0) {
      await prisma.sellerDirectoryEntry
        .deleteMany({
          where: {
            id: { in: Array.from(new Set(createdSellerDirIds)) },
            OR: [
              { linkedOrganizationId: null },
              ...(createdOrgIds.length > 0
                ? [{ linkedOrganizationId: { in: createdOrgIds } }]
                : []),
            ],
          },
        })
        .catch(() => {});
    }
    if (createdOrgIds.length > 0) {
      await prisma.organizationMember
        .deleteMany({ where: { organizationId: { in: createdOrgIds } } })
        .catch(() => {});
      await prisma.organization
        .deleteMany({ where: { id: { in: createdOrgIds } } })
        .catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.user
        .deleteMany({ where: { id: { in: createdUserIds } } })
        .catch(() => {});
    }
  });

  test('Scenarios 1–8: Buyer Profile, Submission, Adaptive Taxonomy, Pending/Completed Remedies, Re-investigation, Filters, Isolation & Storage Integrity', async () => {
    const suffix = Date.now();
    const admin = await prisma.user.findFirstOrThrow({
      where: { OR: [{ isPlatformAdmin: true }, { role: UserRole.ADMIN }], isActive: true },
    });
    const buyerAEmail = `audit.buyera.${suffix}@consumer.demo`;
    const buyerBEmail = `audit.buyerb.${suffix}@consumer.demo`;

    const [buyerA, buyerB] = await Promise.all([
      prisma.user.create({
        data: {
          email: buyerAEmail,
          name: 'Audit Buyer One',
          fullName: 'Audit Buyer One',
          role: UserRole.BUYER,
          isPlatformAdmin: false,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: buyerBEmail,
          name: 'Audit Buyer Two',
          fullName: 'Audit Buyer Two',
          role: UserRole.BUYER,
          isPlatformAdmin: false,
          isActive: true,
        },
      }),
    ]);
    createdUserIds.push(buyerA.id, buyerB.id);

    // Scenario 1: Buyer Profile GET & PATCH DB persistence + validation
    const unauthProfRes = await getProfile(makeJsonReq('http://localhost/api/profile'));
    assert.equal(unauthProfRes.status, 401);

    const profGet = await getProfile(makeJsonReq('http://localhost/api/profile', { email: buyerAEmail }));
    assert.equal(profGet.status, 200);
    const profGetJson = await profGet.json();
    assert.equal(profGetJson.profile.email, buyerAEmail);
    assert.equal(profGetJson.profile.role, 'BUYER');

    const badPatch = await patchProfile(
      makeJsonReq('http://localhost/api/profile', {
        method: 'PATCH',
        email: buyerAEmail,
        body: { fullName: 'A' },
      })
    );
    assert.equal(badPatch.status, 400);

    const profPatch = await patchProfile(
      makeJsonReq('http://localhost/api/profile', {
        method: 'PATCH',
        email: buyerAEmail,
        body: { fullName: 'Audit Buyer Updated', phone: '+91 9876500111' },
      })
    );
    assert.equal(profPatch.status, 200);
    const profPatchJson = await profPatch.json();
    assert.equal(profPatchJson.profile.fullName, 'Audit Buyer Updated');
    assert.equal(profPatchJson.profile.phone, '+91 9876500111');
    assert.equal(profPatchJson.profile.role, 'BUYER');

    // Scenario 3: Category-adaptive slots + AI title fallback + auth gate
    assert.notDeepEqual(
      EVIDENCE_SLOTS_BY_CATEGORY.wrong_product.map((s) => s.id),
      EVIDENCE_SLOTS_BY_CATEGORY.payment_problem.map((s) => s.id)
    );
    const titleUnauth = await suggestTitle(
      makeJsonReq('http://localhost/api/complaints/suggest-title', {
        method: 'POST',
        body: { description: 'Courier left the parcel soaked in rain outside gate.' },
      })
    );
    assert.equal(titleUnauth.status, 401);

    const titleRes = await suggestTitle(
      makeJsonReq('http://localhost/api/complaints/suggest-title', {
        method: 'POST',
        email: buyerAEmail,
        body: { description: 'I ordered a 1 TB NVMe drive but received a 512 GB variant.' },
      })
    );
    assert.equal(titleRes.status, 200);
    const titleJson = await titleRes.json();
    assert.equal(titleJson.title, 'Product specifications differ');

    // Scenario 2 & Scenario 8: Complaint submit w/ image + PDF & Idempotency key dedup
    const idemKey = `audit-idem-${suffix}`;
    const buildSubmitForm = (orderNum: string) => {
      const fd = new FormData();
      fd.append('platform', 'Amazon');
      fd.append('orderId', orderNum);
      fd.append('productName', 'Audit Ergonomic Mechanical Keyboard');
      fd.append('amount', '4599');
      fd.append('currency', 'INR');
      fd.append('category', 'Wrong product received');
      fd.append('title', 'Wrong switch variant delivered');
      fd.append('description', `Order ${orderNum} arrived with linear red instead of tactile brown switches.`);
      fd.append('requestedRemedy', 'FULL_REFUND');
      fd.append('idempotencyKey', idemKey);
      fd.append(
        'evidence_files',
        new File([makePngBytes()], `photo-${suffix}.png`, { type: 'image/png' })
      );
      fd.append('evidence_tags', 'product photograph');
      fd.append(
        'evidence_files',
        new File([makePdfBytes(`Sold By: Unregistered Audit Seller ${suffix}\nOrder ID: ${orderNum}`)], `invoice-${suffix}.pdf`, {
          type: 'application/pdf',
        })
      );
      fd.append('evidence_tags', 'order invoice');
      return fd;
    };

    const sub1 = await submitComplaint(
      makeFormReq('http://localhost/api/complaints/submit', buildSubmitForm(`AMZ-AUD-${suffix}`), buyerAEmail)
    );
    assert.equal(sub1.status, 200);
    const sub1Json = await sub1.json();
    assert.equal(sub1Json.success, true);
    assert.ok(sub1Json.case?.dbId);
    assert.equal(sub1Json.case.evidenceCount, 2);
    createdCaseIds.push(sub1Json.case.dbId);

    const subDup = await submitComplaint(
      makeFormReq('http://localhost/api/complaints/submit', buildSubmitForm(`AMZ-AUD-${suffix}`), buyerAEmail)
    );
    assert.equal(subDup.status, 200);
    const subDupJson = await subDup.json();
    assert.equal(subDupJson.duplicatePrevented, true);
    assert.equal(subDupJson.case.dbId, sub1Json.case.dbId);

    // Scenario 8: Missing real upload key (ev_...) throws 404, never fabricating dummy file
    await assert.rejects(
      async () => {
        await evidenceStorage.getFileStream(`ev_missing_real_upload_${suffix}.pdf`);
      },
      (err: Error) => /not found/i.test(err.message)
    );

    // Scenario 4: Pending vs Completed across Refund & Replacement delivery
    const org = await prisma.organization.create({
      data: { name: `Audit Org ${suffix}`, slug: `audit-org-${suffix}`, isActive: true },
    });
    createdOrgIds.push(org.id);

    const repCase = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-REP-${suffix}`,
        title: 'Replacement tracking accuracy check',
        description: `[Platform: Flipkart | Order ID: FLP-REP-${suffix} | Product: Noise Cancelling Earbuds]\n\nLeft earbud dead on arrival.`,
        category: CaseCategory.DAMAGED_GOODS,
        status: CaseStatus.UNDER_ANALYSIS,
        stage: CaseStage.RESOLUTION_PROPOSED,
        amountMinor: 399900,
        currency: 'INR',
        buyerId: buyerA.id,
        merchantId: admin.id,
        organizationId: org.id,
        recommendedRemedy: 'REPLACEMENT',
      },
    });
    createdCaseIds.push(repCase.id);

    const repOrder = await prisma.commerceOrder.create({
      data: {
        orderNumber: `FLP-REP-${suffix}`,
        buyerId: buyerA.id,
        merchantOrganizationId: org.id,
        currency: 'INR',
        totalAmountMinor: 399900,
        status: 'CAPTURED',
        caseId: repCase.id,
      },
    });

    const passport = await prisma.packagePassport.create({
      data: {
        packageNumber: `PKG-AUD-${suffix}`,
        orderId: repOrder.id,
        merchantOrganizationId: org.id,
        carrierName: 'Delhivery',
        trackingNumber: `DLV-${suffix}`,
        status: 'PACKING',
        qrToken: `QR-${suffix}`,
        integrityHash: crypto.createHash('sha256').update(`PKG-${suffix}`).digest('hex'),
      },
    });
    createdPassportIds.push(passport.id);

    const packingListRes = await getMyComplaints(
      makeJsonReq(`http://localhost/api/complaints/my`, { email: buyerAEmail })
    );
    assert.equal(packingListRes.status, 200);
    const packingList = await packingListRes.json();
    assert.equal(packingList.summary.completedCount, 0);
    assert.equal(packingList.summary.pendingCount, 2);

    const packingDetailRes = await getComplaintDetail(
      makeJsonReq(`http://localhost/api/complaints/${repCase.caseNumber}`, { email: buyerAEmail }),
      { params: Promise.resolve({ caseId: repCase.caseNumber }) }
    );
    const packingDetail = await packingDetailRes.json();
    assert.equal(packingDetail.complaint.status, 'Replacement in progress');
    assert.equal(packingDetail.resolutionSummary.isCompleted, false);

    // Deliver replacement -> Completed
    await prisma.packagePassport.update({
      where: { id: passport.id },
      data: { status: 'DELIVERED', deliveredAt: new Date() },
    });
    await prisma.caseRecord.update({
      where: { id: repCase.id },
      data: { status: CaseStatus.RESOLVED, stage: CaseStage.FINALIZED, resolvedAt: new Date() },
    });

    // Scenario 5: Re-investigation Action Required + supplemental upload on sub1 case
    await prisma.caseEvent.create({
      data: {
        caseId: sub1Json.case.dbId,
        actorId: admin.id,
        eventType: EventType.TIMELINE_EVENT_RECORDED,
        description: 'Need clear photo of keyboard back serial label.',
        metadataJson: JSON.stringify({
          stage: 'REINVESTIGATION_REQUIRED',
          responsibleParty: 'CUSTOMER',
          reason: 'Serial label occluded',
          missingInformation: 'Back label serial photo required.',
        }),
      },
    });

    const beforeExtraRes = await getComplaintDetail(
      makeJsonReq(`http://localhost/api/complaints/${sub1Json.case.caseNumber}`, { email: buyerAEmail }),
      { params: Promise.resolve({ caseId: sub1Json.case.caseNumber }) }
    );
    const beforeExtra = await beforeExtraRes.json();
    assert.equal(beforeExtra.complaint.requiresCustomerAction, true);

    const extraFd = new FormData();
    extraFd.append('note', 'Attached clear back label photo.');
    extraFd.append(
      'evidence_files',
      new File([makePngBytes()], `serial-back-${suffix}.png`, { type: 'image/png' })
    );
    const extraRes = await uploadFollowupEvidence(
      makeFormReq(
        `http://localhost/api/complaints/${sub1Json.case.caseNumber}/evidence`,
        extraFd,
        buyerAEmail
      ),
      { params: Promise.resolve({ caseId: sub1Json.case.caseNumber }) }
    );
    assert.equal(extraRes.status, 200);
    const extraJson = await extraRes.json();
    assert.equal(extraJson.detail.submissionDetails.supportingEvidence.length, 3);

    // Scenario 6: Search, Status, and Date Filters
    const filterCompleted = await getMyComplaints(
      makeJsonReq(`http://localhost/api/complaints/my?status=Completed&date=today`, {
        email: buyerAEmail,
      })
    );
    const filterCompletedJson = await filterCompleted.json();
    assert.equal(filterCompletedJson.items.length, 1);
    assert.equal(filterCompletedJson.items[0].id, repCase.caseNumber);
    assert.equal(filterCompletedJson.summary.completedCount, 1);
    assert.equal(filterCompletedJson.summary.pendingCount, 1);

    const searchRes = await getMyComplaints(
      makeJsonReq(`http://localhost/api/complaints/my?search=${encodeURIComponent(sub1Json.case.caseNumber)}`, {
        email: buyerAEmail,
      })
    );
    const searchJson = await searchRes.json();
    assert.equal(searchJson.items.length, 1);
    assert.equal(searchJson.items[0].id, sub1Json.case.caseNumber);

    // Scenario 7: Cross-buyer isolation (403 & empty list) + MERCHANT_ONLY privacy
    const crossDetail = await getComplaintDetail(
      makeJsonReq(`http://localhost/api/complaints/${sub1Json.case.caseNumber}`, { email: buyerBEmail }),
      { params: Promise.resolve({ caseId: sub1Json.case.caseNumber }) }
    );
    assert.equal(crossDetail.status, 403);

    const crossList = await getMyComplaints(
      makeJsonReq(`http://localhost/api/complaints/my`, { email: buyerBEmail })
    );
    const crossListJson = await crossList.json();
    assert.equal(crossListJson.items.length, 0);
  });

  test('Scenarios 9–16: Multi-Org Seller Switcher, PII Stripping, Empty KPIs, Non-Coercive N/A, Rollback, Thread & Profile RBAC', async () => {
    const suffix = Date.now() + 1;
    const [buyer, admin] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } }),
      prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } }),
    ]);

    const multiEmail = `audit.multiseller.${suffix}@merchant.demo`;
    const viewerEmail = `audit.viewer.${suffix}@merchant.demo`;
    const otherMerchantEmail = `audit.otherorg.${suffix}@merchant.demo`;

    const [multiUser, viewerUser, otherUser, orgA, orgB, inactiveOrg, emptyOrg] = await Promise.all([
      prisma.user.create({
        data: {
          email: multiEmail,
          name: 'Multi Store Seller',
          fullName: 'Multi Store Seller',
          role: UserRole.MERCHANT,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: viewerEmail,
          name: 'Audit Viewer',
          fullName: 'Audit Viewer',
          role: UserRole.MERCHANT,
          isActive: true,
        },
      }),
      prisma.user.create({
        data: {
          email: otherMerchantEmail,
          name: 'Other Org Merchant',
          fullName: 'Other Org Merchant',
          role: UserRole.MERCHANT,
          isActive: true,
        },
      }),
      prisma.organization.create({
        data: { name: `Alpha Retail ${suffix}`, slug: `alpha-retail-${suffix}`, isActive: true },
      }),
      prisma.organization.create({
        data: { name: `Beta Electronics ${suffix}`, slug: `beta-elec-${suffix}`, isActive: true },
      }),
      prisma.organization.create({
        data: { name: `Deactivated Org ${suffix}`, slug: `deact-org-${suffix}`, isActive: false },
      }),
      prisma.organization.create({
        data: { name: `Zero Req Org ${suffix}`, slug: `zero-req-${suffix}`, isActive: true },
      }),
    ]);

    createdUserIds.push(multiUser.id, viewerUser.id, otherUser.id);
    createdOrgIds.push(orgA.id, orgB.id, inactiveOrg.id, emptyOrg.id);

    await prisma.organizationMember.createMany({
      data: [
        { userId: multiUser.id, organizationId: orgA.id, role: OrganizationRole.OWNER, isActive: true },
        { userId: multiUser.id, organizationId: orgB.id, role: OrganizationRole.MERCHANT_AGENT, isActive: true },
        { userId: multiUser.id, organizationId: inactiveOrg.id, role: OrganizationRole.OWNER, isActive: true },
        { userId: viewerUser.id, organizationId: orgA.id, role: OrganizationRole.VIEWER, isActive: true },
        { userId: otherUser.id, organizationId: emptyOrg.id, role: OrganizationRole.OWNER, isActive: true },
      ],
    });

    const gstinA = makeUniqueGstin('ALP', suffix);
    const gstinAUpdated = makeUniqueGstin('UPG', suffix + 31);
    const dirA = await prisma.sellerDirectoryEntry.create({
      data: {
        legalName: `Alpha Retail Private Limited ${suffix}`,
        normalizedLegalName: `alpha retail private limited ${suffix}`,
        displayName: `Alpha Retail ${suffix}`,
        gstin: gstinA,
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        identityStatus: 'VERIFIED',
        linkedOrganizationId: orgA.id,
        linkedMerchantUserId: multiUser.id,
      },
    });
    createdSellerDirIds.push(dirA.id);

    // Scenario 9: Multi-org switcher + inactive org rejection
    const profDefault = await getSellerProfile(
      makeJsonReq('http://localhost/api/seller/profile', { email: multiEmail })
    );
    assert.equal(profDefault.status, 200);
    const profDefaultJson = await profDefault.json();
    assert.equal(profDefaultJson.profile.availableOrganizations.length, 2);
    assert.equal(profDefaultJson.profile.organizationId, orgA.id);

    const profB = await getSellerProfile(
      makeJsonReq(`http://localhost/api/seller/profile?organizationId=${orgB.id}`, {
        email: multiEmail,
      })
    );
    assert.equal(profB.status, 200);
    const profBJson = await profB.json();
    assert.equal(profBJson.profile.organizationId, orgB.id);
    assert.equal(profBJson.profile.membershipRole, 'MERCHANT_AGENT');

    const profInactive = await getSellerProfile(
      makeJsonReq(`http://localhost/api/seller/profile?organizationId=${inactiveOrg.id}`, {
        email: multiEmail,
      })
    );
    assert.equal(profInactive.status, 403);

    // Scenario 11: Zero-request empty org KPIs must be exactly 0
    const emptyReqRes = await getSellerRequests(
      makeJsonReq('http://localhost/api/seller/requests', { email: otherMerchantEmail })
    );
    assert.equal(emptyReqRes.status, 200);
    const emptyReqJson = await emptyReqRes.json();
    assert.equal(emptyReqJson.requests.length, 0);
    assert.equal(emptyReqJson.summary.newRequests, 0);
    assert.equal(emptyReqJson.summary.inProgress, 0);
    assert.equal(emptyReqJson.summary.submitted, 0);

    // Scenario 12: Category-adaptive Seller form config
    const cfgWrong = SellerEvidenceRequirementsService.getDynamicFormConfig({
      category: CaseCategory.NOT_AS_DESCRIBED,
      originalCategory: 'WRONG_PRODUCT',
      productName: 'Monitor 27"',
    });
    const cfgDamaged = SellerEvidenceRequirementsService.getDynamicFormConfig({
      category: CaseCategory.DAMAGED_GOODS,
      originalCategory: 'DAMAGED_PRODUCT',
      productName: 'Monitor 27"',
    });
    assert.notDeepEqual(
      cfgWrong.step2Fields.map((f) => f.key),
      cfgDamaged.step2Fields.map((f) => f.key)
    );

    // Create complaint with sensitive buyer PII in text & orchestrate Seller Portal request to orgA
    const cCase = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-SEL-${suffix}`,
        title: `Contact me at buyer.secret${suffix}@gmail.com or +91 9811122334 for damaged laptop`,
        description: `Order ID: AMZ-SEL-${suffix}. Call +91 9811122334 or email buyer.secret${suffix}@gmail.com`,
        category: CaseCategory.DAMAGED_GOODS,
        status: CaseStatus.SUBMITTED,
        stage: CaseStage.EVIDENCE_GATHERING,
        amountMinor: 5499900,
        currency: 'INR',
        buyerId: buyer.id,
        merchantId: admin.id,
      },
    });
    createdCaseIds.push(cCase.id);

    const buyerInv = await evidenceStorage.saveFile(
      Buffer.from(makePdfBytes(`Sold By: Alpha Retail Private Limited ${suffix}\nSeller GSTIN: ${gstinA}\nOrder ID: AMZ-SEL-${suffix}`)),
      `buyer-inv-${suffix}.pdf`,
      'application/pdf'
    );
    createdStorageKeys.push(buyerInv.storageKey);

    const evRow = await prisma.evidence.create({
      data: {
        caseId: cCase.id,
        uploadedById: buyer.id,
        filename: `buyer-inv-${suffix}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: buyerInv.sizeBytes,
        storageKey: buyerInv.storageKey,
        sha256: buyerInv.sha256,
        evidenceType: 'INVOICE',
        sourceType: 'BUYER_UPLOAD',
        verificationStatus: 'VERIFIED',
        visibility: 'SHARED_WITH_PARTICIPANTS',
        scanStatus: 'CLEAN',
      },
    });
    await prisma.evidenceAnalysisResult.create({
      data: {
        evidenceId: evRow.id,
        assessmentState: 'SUFFICIENT',
        confidence: 0.95,
        findingsSummary: 'Clear invoice',
        humanReviewRecommended: false,
        analysisMethod: 'TEST',
      },
    });

    const orch = await SellerWorkflowOrchestrator.initiateAfterScreening({
      caseIdOrNumber: cCase.id,
      actorId: buyer.id,
      marketplaceHint: 'AMAZON',
      orderIdHint: `AMZ-SEL-${suffix}`,
      productNameHint: 'Pro Laptop 14',
      inMemoryDocuments: [
        {
          evidenceId: evRow.id,
          filename: evRow.filename,
          mimeType: 'application/pdf',
          rawText: `Sold By: Alpha Retail Private Limited ${suffix}\nSeller GSTIN: ${gstinA}\nOrder ID: AMZ-SEL-${suffix}`,
        },
      ],
    });

    const reqId = orch.gatewayResult?.requestId;
    assert.ok(reqId);

    // Scenario 10: PII Stripping on request detail & list
    const reqDetailRes = await getSellerRequestDetail(
      makeJsonReq(`http://localhost/api/seller/requests/${reqId}`, { email: multiEmail }),
      { params: Promise.resolve({ requestId: reqId }) }
    );
    assert.equal(reqDetailRes.status, 200);
    const reqDetailStr = JSON.stringify(await reqDetailRes.json());
    assert.ok(!reqDetailStr.includes(`buyer.secret${suffix}@gmail.com`), 'Must strip buyer email');
    assert.ok(!reqDetailStr.includes('9811122334'), 'Must strip buyer phone');
    assert.ok(!reqDetailStr.includes(buyer.email), 'Must not include buyer account email');

    // Draft save moves request to IN_PROGRESS
    const draftRes = await saveSellerDraft(
      makeJsonReq(`http://localhost/api/seller/requests/${reqId}`, {
        method: 'PATCH',
        email: multiEmail,
        body: { draft: { stance: 'DISAGREE', summary: 'Draft inspection notes', currentStep: 2 } },
      }),
      { params: Promise.resolve({ requestId: reqId }) }
    );
    assert.equal(draftRes.status, 200);

    // Scenario 13: NOT_AVAILABLE & NOT_APPLICABLE non-coercive submission with zero uploads
    const naFd = new FormData();
    naFd.append(
      'payload',
      JSON.stringify({
        stance: 'DISAGREE',
        summary: 'Item inspected cleanly; packing CCTV is archived after 30 days and unavailable.',
        declarationConfirmed: true,
        idempotencyKey: `na-idem-${suffix}`,
        itemResponses: [
          { key: 'pre_dispatch_photos', status: 'NOT_AVAILABLE', note: 'Warehouse camera archived after 30d' },
          { key: 'seal_confirmation', status: 'NOT_APPLICABLE', note: 'Manufacturer shrink-wrap sealed' },
        ],
      })
    );
    const naRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${reqId}/respond`, naFd, multiEmail),
      { params: Promise.resolve({ requestId: reqId }) }
    );
    assert.ok([200, 201].includes(naRes.status));
    const naJson = await naRes.json();
    assert.equal(naJson.response.verificationStatus, 'NEEDS_REVIEW');

    // Scenario 15 & 14: Request Additional Info -> Second Append-Only Response WITH binary uploads + BERR update
    const infoReqRes = await followUpSellerRequest(
      makeJsonReq(`http://localhost/api/seller/requests/${reqId}/follow-up`, {
        method: 'POST',
        email: admin.email,
        body: {
          action: 'REQUEST_ADDITIONAL_EVIDENCE',
          prompt: 'Please upload the courier weight manifest and packing scan slip.',
        },
      }),
      { params: Promise.resolve({ requestId: reqId }) }
    );
    assert.equal(infoReqRes.status, 200);

    const fileFd = new FormData();
    fileFd.append(
      'payload',
      JSON.stringify({
        stance: 'DISAGREE',
        summary: `Courier weight slip and dispatch manifest confirm AMZ-SEL-${suffix} left warehouse undamaged.`,
        declarationConfirmed: true,
        idempotencyKey: `files-idem-${suffix}`,
        fileMetadata: [{ evidenceType: 'DOCUMENT', visibility: 'SHARED_WITH_PARTICIPANTS' }],
      })
    );
    fileFd.append(
      'files',
      new File(
        [makePdfBytes(`Alpha Retail ${suffix} Order AMZ-SEL-${suffix} Pro Laptop 14 Weight 2.1kg`)],
        `manifest-${suffix}.pdf`,
        { type: 'application/pdf' }
      )
    );
    const fileRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${reqId}/respond`, fileFd, multiEmail),
      { params: Promise.resolve({ requestId: reqId }) }
    );
    assert.ok([200, 201].includes(fileRes.status));
    const fileJson = await fileRes.json();
    assert.equal(fileJson.response.uploadedEvidenceIds.length, 1);

    // Scenario 14 extra check: LocalEvidenceStorage file resolution & deletion unlinks genuine file cleanly
    const uploadedEvRow = await prisma.evidence.findUniqueOrThrow({
      where: { id: fileJson.response.uploadedEvidenceIds[0] },
    });
    const resolvedDiskPath = evidenceStorage.resolveExistingPath(uploadedEvRow.storageKey);
    assert.ok(resolvedDiskPath, 'Uploaded file must resolve inside private storage');
    await fs.stat(resolvedDiskPath);

    const responsesListRes = await getSellerResponses(
      makeJsonReq(`http://localhost/api/seller/responses?q=AMZ-SEL-${suffix}`, { email: multiEmail })
    );
    const responsesListJson = await responsesListRes.json();
    assert.equal(responsesListJson.responses.length, 2, 'Append-only responses must preserve both submissions');

    const respDetailRes = await getSellerResponseDetail(
      makeJsonReq(`http://localhost/api/seller/responses/${fileJson.response.responseId}`, {
        email: multiEmail,
      }),
      { params: Promise.resolve({ responseId: fileJson.response.responseId }) }
    );
    assert.equal(respDetailRes.status, 200);

    const berrCount = await prisma.berrAssessmentRecord.count({ where: { caseId: cCase.id } });
    assert.ok(berrCount >= 1, 'Seller submission should trigger BERR assessment persistence');

    // Scenario 16: Viewer RBAC block & Owner GSTIN change re-verification
    const viewerPatchRes = await patchSellerProfile(
      makeJsonReq('http://localhost/api/seller/profile', {
        method: 'PATCH',
        email: viewerEmail,
        body: { organizationId: orgA.id, displayName: 'Blocked Change' },
      })
    );
    assert.equal(viewerPatchRes.status, 403);

    const ownerGstinPatch = await patchSellerProfile(
      makeJsonReq('http://localhost/api/seller/profile', {
        method: 'PATCH',
        email: multiEmail,
        body: { organizationId: orgA.id, gstin: gstinAUpdated },
      })
    );
    assert.equal(ownerGstinPatch.status, 200);
    const ownerGstinJson = await ownerGstinPatch.json();
    assert.equal(ownerGstinJson.profile.verificationStatus, 'VERIFICATION_PENDING');
  });

  test('Scenarios 17–20: Integrated Proposal Approval Lifecycle, Unregistered Seller Fallback, Security Attacks & Notification Persistence', async () => {
    const suffix = Date.now() + 2;
    const [buyer, admin] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: 'usr_alex_buyer' } }),
      prisma.user.findUniqueOrThrow({ where: { id: 'usr_priya_admin' } }),
    ]);

    const isolatedBuyerEmail = `audit.fullflow.${suffix}@consumer.demo`;
    const isolatedBuyer = await prisma.user.create({
      data: {
        email: isolatedBuyerEmail,
        name: 'Flow Buyer',
        fullName: 'Flow Buyer',
        role: UserRole.BUYER,
        isActive: true,
      },
    });
    createdUserIds.push(isolatedBuyer.id);

    const org = await prisma.organization.create({
      data: { name: `Integrated Seller ${suffix}`, slug: `int-seller-${suffix}`, isActive: true },
    });
    createdOrgIds.push(org.id);

    const sellerEmail = `audit.intseller.${suffix}@merchant.demo`;
    const sellerUser = await prisma.user.create({
      data: {
        email: sellerEmail,
        name: 'Integrated Merchant',
        fullName: 'Integrated Merchant',
        role: UserRole.MERCHANT,
        isActive: true,
      },
    });
    createdUserIds.push(sellerUser.id);
    await prisma.organizationMember.create({
      data: { userId: sellerUser.id, organizationId: org.id, role: OrganizationRole.OWNER, isActive: true },
    });

    const gstinInt = makeUniqueGstin('INT', suffix + 53);
    const dirEntry = await prisma.sellerDirectoryEntry.create({
      data: {
        legalName: `Integrated Seller Retail ${suffix} Pvt Ltd`,
        normalizedLegalName: `integrated seller retail ${suffix} pvt ltd`,
        displayName: `Integrated Seller ${suffix}`,
        gstin: gstinInt,
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        identityStatus: 'VERIFIED',
        linkedOrganizationId: org.id,
        linkedMerchantUserId: sellerUser.id,
      },
    });
    createdSellerDirIds.push(dirEntry.id);

    // Scenario 17: Integrated Buyer Submit -> Seller Portal -> Respond -> Proposal -> Accept -> Refund
    const cFd = new FormData();
    cFd.append('platform', 'Amazon');
    cFd.append('orderId', `AMZ-INT-${suffix}`);
    cFd.append('productName', 'Studio Headphones');
    cFd.append('amount', '2999');
    cFd.append('currency', 'INR');
    cFd.append('category', 'Damaged product received');
    cFd.append('title', 'Headband arrived snapped');
    cFd.append('description', `Order AMZ-INT-${suffix} arrived with broken hinge.`);
    cFd.append('requestedRemedy', 'FULL_REFUND');
    cFd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: Integrated Seller Retail ${suffix} Pvt Ltd\nSeller GSTIN: ${gstinInt}\nOrder ID: AMZ-INT-${suffix}`)],
        `int-inv-${suffix}.pdf`,
        { type: 'application/pdf' }
      )
    );
    cFd.append('evidence_tags', 'order invoice');

    const submitRes = await submitComplaint(
      makeFormReq('http://localhost/api/complaints/submit', cFd, isolatedBuyerEmail)
    );
    assert.equal(submitRes.status, 200);
    const submitJson = await submitRes.json();
    const caseDbId = submitJson.case.dbId;
    const caseNumber = submitJson.case.caseNumber;
    createdCaseIds.push(caseDbId);

    const linkedReq = await prisma.sellerEvidenceRequest.findFirst({
      where: { caseId: caseDbId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(linkedReq);
    assert.equal(linkedReq.deliveryChannel, 'SELLER_PORTAL');

    const sFd = new FormData();
    sFd.append(
      'payload',
      JSON.stringify({
        stance: 'AGREE',
        summary: 'Transit crush confirmed; agreeing to refund.',
        declarationConfirmed: true,
        idempotencyKey: `int-agree-${suffix}`,
      })
    );
    const sResp = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${linkedReq.id}/respond`, sFd, sellerEmail),
      { params: Promise.resolve({ requestId: linkedReq.id }) }
    );
    assert.ok([200, 201].includes(sResp.status));

    // RM proposes full refund -> PENDING_BUYER -> Buyer accepts
    const proposal = await ProposalWorkflowService.createProposal({
      caseId: caseDbId,
      proposedById: admin.id,
      proposalType: 'FULL_REFUND',
      title: `Full Refund ₹2999 (${caseNumber})`,
      description: 'Seller agreed transit damage. Approve full refund.',
      amountMinor: 299900,
      currency: 'INR',
      reason: 'Mutual agreement confirmed by seller response.',
    });
    assert.equal(proposal.status, 'PENDING_BUYER');

    const detailBeforeAccept = await getComplaintDetail(
      makeJsonReq(`http://localhost/api/complaints/${caseNumber}`, { email: isolatedBuyerEmail }),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    const detailBeforeJson = await detailBeforeAccept.json();
    assert.equal(detailBeforeJson.resolutionSummary.pendingBuyerProposal?.id, proposal.id);

    const acceptRes = await respondToProposal(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposal.id}/respond`, {
        method: 'POST',
        email: isolatedBuyerEmail,
        body: { response: 'ACCEPTED', comment: 'Confirmed refund destination.' },
      }),
      { params: Promise.resolve({ proposalId: proposal.id }) }
    );
    assert.equal(acceptRes.status, 200);
    const acceptJson = await acceptRes.json();
    assert.equal(acceptJson.proposal.status, 'AGREED');

    // Scenario 18: Unregistered seller Help Centre fallback + buyer outreach ticket recording
    const unregToken = suffix.toString(36).toUpperCase();
    const unregFd = new FormData();
    unregFd.append('platform', 'Flipkart');
    unregFd.append('orderId', `FLP-UNREG-${suffix}`);
    unregFd.append('productName', 'Bluetooth Speaker');
    unregFd.append('amount', '1499');
    unregFd.append('currency', 'INR');
    unregFd.append('category', 'Item missing from package');
    unregFd.append('title', 'Charging cable missing');
    unregFd.append('description', `Order FLP-UNREG-${suffix} arrived without charging cable.`);
    unregFd.append('requestedRemedy', 'REPLACEMENT');
    unregFd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: Kestrel ${unregToken} Trading Co\nOrder ID: FLP-UNREG-${suffix}\nFlipkart`)],
        `unreg-inv-${suffix}.pdf`,
        { type: 'application/pdf' }
      )
    );
    unregFd.append('evidence_tags', 'order invoice');

    const unregSubmitRes = await submitComplaint(
      makeFormReq('http://localhost/api/complaints/submit', unregFd, isolatedBuyerEmail)
    );
    assert.equal(unregSubmitRes.status, 200);
    const unregJson = await unregSubmitRes.json();
    createdCaseIds.push(unregJson.case.dbId);

    const outreachReq = await prisma.sellerEvidenceRequest.findFirst({
      where: { caseId: unregJson.case.dbId },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(outreachReq);
    assert.equal(outreachReq.deliveryChannel, 'CUSTOMER_ASSISTED_HELP_CENTRE');
    assert.equal(outreachReq.registrationStatus, 'IDENTIFIED_UNREGISTERED');

    const markOutreachRes = await postOutreachSubmission(
      makeJsonReq(`http://localhost/api/complaints/${unregJson.case.caseNumber}/seller-outreach`, {
        method: 'POST',
        email: isolatedBuyerEmail,
        body: {
          requestId: outreachReq.id,
          ticketReference: `FK-HELP-${suffix}`,
          note: 'Submitted message inside Flipkart Help Centre.',
        },
      }),
      { params: Promise.resolve({ caseId: unregJson.case.caseNumber }) }
    );
    assert.equal(markOutreachRes.status, 200);
    const markOutreachJson = await markOutreachRes.json();
    assert.equal(markOutreachJson.request.status, 'MARKETPLACE_SUPPORT_PENDING');

    // Scenario 19: Security Attack Matrix (401/403 enforcement)
    const [
      unauthUsers,
      buyerUsers,
      buyerCreateOrg,
      sellerFollowUpAttack,
      crossEvidenceAttack,
    ] = await Promise.all([
      getUsers(makeJsonReq('http://localhost/api/users')),
      getUsers(makeJsonReq('http://localhost/api/users', { email: isolatedBuyerEmail })),
      createOrg(
        makeJsonReq('http://localhost/api/organizations', {
          method: 'POST',
          email: isolatedBuyerEmail,
          body: { name: 'Hijacked Buyer Org' },
        })
      ),
      followUpSellerRequest(
        makeJsonReq(`http://localhost/api/seller/requests/${linkedReq.id}/follow-up`, {
          method: 'POST',
          email: sellerEmail,
          body: { action: 'FOLLOW_UP' },
        }),
        { params: Promise.resolve({ requestId: linkedReq.id }) }
      ),
      downloadEvidence(
        makeJsonReq(`http://localhost/api/evidence/ev_nonexistent_${suffix}/download`, {
          email: buyer.email,
        }),
        { params: Promise.resolve({ evidenceId: `ev_nonexistent_${suffix}` }) }
      ),
    ]);

    assert.equal(unauthUsers.status, 401);
    assert.equal(buyerUsers.status, 403);
    assert.equal(buyerCreateOrg.status, 403);
    assert.equal(sellerFollowUpAttack.status, 403);
    assert.equal(crossEvidenceAttack.status, 404);

    // Scenario 20: Notification counts, mark-one-read & read-all persistence
    const notifGet1 = await getNotifications(
      makeJsonReq('http://localhost/api/notifications', { email: isolatedBuyerEmail })
    );
    assert.equal(notifGet1.status, 200);
    const notifJson1 = await notifGet1.json();
    assert.ok(notifJson1.unreadCount >= 2);
    const firstNotifId = notifJson1.notifications[0].id;

    const readOneRes = await readNotification(
      makeJsonReq(`http://localhost/api/notifications/${firstNotifId}/read`, {
        method: 'POST',
        email: isolatedBuyerEmail,
      }),
      { params: Promise.resolve({ id: firstNotifId }) }
    );
    assert.equal(readOneRes.status, 200);

    const readAllRes = await readAllNotifications(
      makeJsonReq('http://localhost/api/notifications/read-all', {
        method: 'POST',
        email: isolatedBuyerEmail,
      })
    );
    assert.equal(readAllRes.status, 200);

    const notifAfter = await getNotifications(
      makeJsonReq('http://localhost/api/notifications', { email: isolatedBuyerEmail })
    );
    const notifAfterJson = await notifAfter.json();
    assert.equal(notifAfterJson.unreadCount, 0);
  });
});
