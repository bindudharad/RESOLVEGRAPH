import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  CaseCategory,
  CaseStatus,
  OrganizationRole,
  UserRole,
  VerificationStatus,
} from '@/generated/prisma/client';

import { POST as submitComplaint } from '@/app/api/complaints/submit/route';
import { POST as addComplaintEvidence } from '@/app/api/complaints/[caseId]/evidence/route';
import { POST as respondSellerRequest } from '@/app/api/seller/requests/[requestId]/respond/route';
import { GET as getResolutionOptions } from '@/app/api/cases/[caseId]/resolution-options/route';
import {
  GET as getProposalsApi,
  POST as createProposalApi,
} from '@/app/api/cases/[caseId]/resolution-proposals/route';
import { POST as respondProposalApi } from '@/app/api/resolution-proposals/[proposalId]/respond/route';
import { POST as reviewProposalApi } from '@/app/api/resolution-proposals/[proposalId]/review/route';
import { POST as executeProposalApi } from '@/app/api/resolution-proposals/[proposalId]/execute/route';
import { POST as createReplacementApi } from '@/app/api/replacements/route';
import { POST as actReplacementApi } from '@/app/api/replacements/[fulfillmentId]/route';
import { GET as getComplaintDetailApi } from '@/app/api/complaints/[caseId]/route';
import { POST as reviewBerrApi } from '@/app/api/cases/[caseId]/berr-v2/review/route';
import { PATCH as resolveSellerMatchApi } from '@/app/api/cases/[caseId]/seller-workflow/route';

import { BegSyncService } from '@/server/graph/beg-sync.service';
import { BegPersistenceService } from '@/server/graph/beg-persistence.service';
import { BerrV2Service } from '@/server/ai/reasoning/berr-v2.service';
import { ResolutionEngine } from '@/server/resolution/resolution-engine';
import { ProposalWorkflowService } from '@/server/resolution/proposal-workflow';
import { PayPalProviderFactory } from '@/server/paypal/paypal-provider.factory';
import { PayPalMockProvider } from '@/server/paypal/providers/paypal-mock.provider';
import { WebhookProcessingService } from '@/server/paypal/services/webhook-processing.service';
import { RefundService } from '@/server/paypal/services/refund.service';
import { BuyerTrackingService } from '@/server/services/buyer-tracking.service';
import type {
  PayPalRefundParams,
  PayPalRefundResponse,
} from '@/server/paypal/providers/paypal-provider.interface';

const RUN_ID = Math.floor(100000 + Math.random() * 899999).toString();
const SHORT_TAG = `E2E${RUN_ID}`;

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

function makeFormReq(url: string, formData: FormData, email?: string): NextRequest {
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

class ControllableMockPayPalProvider extends PayPalMockProvider {
  public refundMode: 'COMPLETED' | 'PENDING' | 'FAIL_THROW' | 'DELAYED_COMPLETED' = 'COMPLETED';
  public refundCalls = 0;

  public async seedCapturedPayment(amountMinor: number, currency: string) {
    const order = await this.createOrder(
      {
        amountMinor,
        currency,
        referenceId: `ORD-${RUN_ID}-${this.refundCalls}-${Math.random().toString(36).slice(2, 6)}`,
      },
      `idem-ord-${Date.now()}-${Math.random()}`
    );
    const capture = await this.captureOrder(order.id, `idem-cap-${Date.now()}-${Math.random()}`);
    return {
      providerOrderId: order.id,
      captureId: capture.id,
    };
  }

  public override async refundCapture(
    params: PayPalRefundParams,
    idempotencyKey: string
  ): Promise<PayPalRefundResponse> {
    this.refundCalls += 1;

    if (this.refundMode === 'FAIL_THROW') {
      throw new Error('Simulated payment gateway 503 service unavailable');
    }

    if (this.refundMode === 'DELAYED_COMPLETED') {
      await new Promise((r) => setTimeout(r, 60));
      return super.refundCapture(params, idempotencyKey);
    }

    if (this.refundMode === 'PENDING') {
      const base = await super.refundCapture(params, idempotencyKey);
      return {
        ...base,
        status: 'PENDING',
      };
    }

    return super.refundCapture(params, idempotencyKey);
  }
}

describe(
  'PHASE 7 — Complete End-to-End BEG -> BERR -> Policy -> Authorization -> Execution -> Completion Audit',
  { concurrency: 1 },
  () => {
  const createdCaseIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdUserIds: string[] = [];
  const createdOrgIds: string[] = [];
  const createdSellerIds: string[] = [];
  const createdWebhookEventIds: string[] = [];

  let buyerEmail = '';
  let buyerId = '';
  let foreignBuyerEmail = '';
  let managerEmail = '';
  let managerId = '';
  let adminEmail = '';
  let adminId = '';
  let investigatorEmail = '';
  let sellerAEmail = '';
  let sellerAOrgId = '';
  let sellerADirId = '';
  let sellerAGstin = '';
  let sellerBEmail = '';
  let sellerBOrgId = '';
  let sellerBDirId = '';
  let sellerViewerEmail = '';

  const controllableProvider = new ControllableMockPayPalProvider();

  function getBuyerAuthUser() {
    return {
      id: buyerId,
      role: UserRole.BUYER,
      isPlatformAdmin: false,
      orgMemberships: [],
      email: buyerEmail,
      name: 'Buyer',
      fullName: 'Buyer',
      isActive: true,
      avatarUrl: null,
      organization: null,
    };
  }

  async function attachCapturedPaymentToCase(params: {
    caseId: string;
    orderNumber: string;
    amountMinor: number;
    currency: string;
    orgId: string;
    productTitle: string;
    sku?: string;
  }) {
    const cap = await controllableProvider.seedCapturedPayment(params.amountMinor, params.currency);
    const order = await prisma.commerceOrder.create({
      data: {
        orderNumber: params.orderNumber,
        buyerId,
        merchantOrganizationId: params.orgId,
        caseId: params.caseId,
        totalAmountMinor: params.amountMinor,
        currency: params.currency,
        status: 'CAPTURED',
        items: {
          create: {
            productReference: params.sku || `SKU-${SHORT_TAG}`,
            title: params.productTitle,
            sku: params.sku || `SKU-${SHORT_TAG}`,
            quantity: 1,
            unitAmountMinor: params.amountMinor,
            totalAmountMinor: params.amountMinor,
          },
        },
        payments: {
          create: {
            providerOrderId: cap.providerOrderId,
            captureId: cap.captureId,
            amountMinor: params.amountMinor,
            currency: params.currency,
            paymentStatus: 'COMPLETED',
          },
        },
      },
      include: { payments: true },
    });
    createdOrderIds.push(order.id);
    return { order, payment: order.payments[0] };
  }

  before(async () => {
    PayPalProviderFactory.setProvider(controllableProvider);

    const buyer = await prisma.user.create({
      data: {
        email: `e2e.buyer.${RUN_ID}@resolvegraph.test`,
        name: `Audit Buyer ${RUN_ID}`,
        fullName: `Audit Buyer ${RUN_ID}`,
        role: UserRole.BUYER,
        isPlatformAdmin: false,
      },
    });
    buyerId = buyer.id;
    buyerEmail = buyer.email;
    createdUserIds.push(buyer.id);

    const foreignBuyer = await prisma.user.create({
      data: {
        email: `e2e.foreign.${RUN_ID}@resolvegraph.test`,
        name: `Foreign Buyer ${RUN_ID}`,
        fullName: `Foreign Buyer ${RUN_ID}`,
        role: UserRole.BUYER,
        isPlatformAdmin: false,
      },
    });
    foreignBuyerEmail = foreignBuyer.email;
    createdUserIds.push(foreignBuyer.id);

    const manager = await prisma.user.create({
      data: {
        email: `e2e.manager.${RUN_ID}@resolvegraph.test`,
        name: `Audit Manager ${RUN_ID}`,
        fullName: `Audit Manager ${RUN_ID}`,
        role: UserRole.RESOLUTION_MANAGER,
        isPlatformAdmin: false,
      },
    });
    managerId = manager.id;
    managerEmail = manager.email;
    createdUserIds.push(manager.id);

    const admin = await prisma.user.create({
      data: {
        email: `e2e.admin.${RUN_ID}@resolvegraph.test`,
        name: `Audit Admin ${RUN_ID}`,
        fullName: `Audit Admin ${RUN_ID}`,
        role: UserRole.ADMIN,
        isPlatformAdmin: true,
      },
    });
    adminId = admin.id;
    adminEmail = admin.email;
    createdUserIds.push(admin.id);

    const investigator = await prisma.user.create({
      data: {
        email: `e2e.investigator.${RUN_ID}@resolvegraph.test`,
        name: `Audit Investigator ${RUN_ID}`,
        fullName: `Audit Investigator ${RUN_ID}`,
        role: UserRole.MERCHANT,
        isPlatformAdmin: false,
      },
    });
    investigatorEmail = investigator.email;
    createdUserIds.push(investigator.id);

    const sellerAUser = await prisma.user.create({
      data: {
        email: `e2e.sellerA.${RUN_ID}@resolvegraph.test`,
        name: `Seller A Owner ${RUN_ID}`,
        fullName: `Seller A Owner ${RUN_ID}`,
        role: UserRole.MERCHANT,
        isPlatformAdmin: false,
      },
    });
    sellerAEmail = sellerAUser.email;
    createdUserIds.push(sellerAUser.id);

    const viewerUser = await prisma.user.create({
      data: {
        email: `e2e.viewerA.${RUN_ID}@resolvegraph.test`,
        name: `Seller A Viewer ${RUN_ID}`,
        fullName: `Seller A Viewer ${RUN_ID}`,
        role: UserRole.MERCHANT,
        isPlatformAdmin: false,
      },
    });
    sellerViewerEmail = viewerUser.email;
    createdUserIds.push(viewerUser.id);

    const orgA = await prisma.organization.create({
      data: {
        name: `AuditAlphaStore ${SHORT_TAG}`,
        slug: `audit-alpha-${RUN_ID}`,
        members: {
          create: [
            { userId: sellerAUser.id, role: OrganizationRole.OWNER, isActive: true },
            { userId: viewerUser.id, role: OrganizationRole.VIEWER, isActive: true },
            { userId: investigator.id, role: OrganizationRole.RESOLUTION_MANAGER, isActive: true },
            { userId: manager.id, role: OrganizationRole.RESOLUTION_MANAGER, isActive: true },
          ],
        },
      },
    });
    sellerAOrgId = orgA.id;
    createdOrgIds.push(orgA.id);

    sellerAGstin = `29ABCDE${RUN_ID.slice(0, 4)}F1Z5`.slice(0, 15);
    const dirA = await prisma.sellerDirectoryEntry.create({
      data: {
        legalName: `AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}`,
        normalizedLegalName: `auditalpha electronics pvt ltd ${SHORT_TAG.toLowerCase()}`,
        displayName: `AuditAlpha ${SHORT_TAG}`,
        gstin: sellerAGstin,
        identityStatus: 'VERIFIED',
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        linkedOrganizationId: orgA.id,
        linkedMerchantUserId: sellerAUser.id,
      },
    });
    sellerADirId = dirA.id;
    createdSellerIds.push(dirA.id);

    const sellerBUser = await prisma.user.create({
      data: {
        email: `e2e.sellerB.${RUN_ID}@resolvegraph.test`,
        name: `Seller B Owner ${RUN_ID}`,
        fullName: `Seller B Owner ${RUN_ID}`,
        role: UserRole.MERCHANT,
        isPlatformAdmin: false,
      },
    });
    sellerBEmail = sellerBUser.email;
    createdUserIds.push(sellerBUser.id);

    const orgB = await prisma.organization.create({
      data: {
        name: `AuditBetaSupply ${SHORT_TAG}`,
        slug: `audit-beta-${RUN_ID}`,
        members: {
          create: [
            { userId: sellerBUser.id, role: OrganizationRole.OWNER, isActive: true },
            { userId: manager.id, role: OrganizationRole.RESOLUTION_MANAGER, isActive: true },
          ],
        },
      },
    });
    sellerBOrgId = orgB.id;
    createdOrgIds.push(orgB.id);

    const dirB = await prisma.sellerDirectoryEntry.create({
      data: {
        legalName: `AuditBeta Supply Co ${SHORT_TAG}`,
        normalizedLegalName: `auditbeta supply co ${SHORT_TAG.toLowerCase()}`,
        displayName: `AuditBeta ${SHORT_TAG}`,
        gstin: `27ZYXWV${RUN_ID.slice(0, 4)}A1Z9`.slice(0, 15),
        identityStatus: 'VERIFIED',
        registrationStatus: 'REGISTERED',
        verificationStatus: 'VERIFIED',
        linkedOrganizationId: orgB.id,
        linkedMerchantUserId: sellerBUser.id,
      },
    });
    sellerBDirId = dirB.id;
    createdSellerIds.push(dirB.id);
  });

  after(async () => {
    PayPalProviderFactory.setProvider(null);
    if (createdWebhookEventIds.length > 0) {
      await prisma.payPalWebhookEvent.deleteMany({
        where: { paypalEventId: { in: createdWebhookEventIds } },
      }).catch(() => {});
    }
    if (createdCaseIds.length > 0) {
      await prisma.replacementFulfillment.deleteMany({
        where: { caseId: { in: createdCaseIds } },
      }).catch(() => {});
      await prisma.refundTransaction.deleteMany({
        where: {
          payment: {
            commerceOrder: { caseId: { in: createdCaseIds } },
          },
        },
      }).catch(() => {});
      await prisma.sellerEvidenceRequest.deleteMany({
        where: { caseId: { in: createdCaseIds } },
      }).catch(() => {});
      await prisma.caseRecord.deleteMany({
        where: { id: { in: createdCaseIds } },
      }).catch(() => {});
    }
    if (createdOrderIds.length > 0) {
      await prisma.packagePassport.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      }).catch(() => {});
      await prisma.commerceOrder.deleteMany({
        where: { id: { in: createdOrderIds } },
      }).catch(() => {});
    }
    if (createdSellerIds.length > 0) {
      await prisma.sellerDirectoryEntry.deleteMany({
        where: { id: { in: createdSellerIds } },
      }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.notificationMessage.deleteMany({
        where: { userId: { in: createdUserIds } },
      }).catch(() => {});
    }
    if (createdOrgIds.length > 0) {
      await prisma.organization.deleteMany({
        where: { id: { in: createdOrgIds } },
      }).catch(() => {});
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      }).catch(() => {});
    }
  });

  test('Test 1 — Clear Refund: Buyer + Seller AGREE -> BEG + BERR -> Policy -> Authorize -> Pending Refund -> Webhook COMPLETED -> RESOLVED', async () => {
    controllableProvider.refundMode = 'PENDING';
    const orderNum = `AMZ-REF-${SHORT_TAG}-01`;

    const fd = new FormData();
    fd.append('platform', 'Amazon');
    fd.append('orderId', orderNum);
    fd.append('productName', 'Sony WH-1000XM5 Headphones');
    fd.append('amount', '299');
    fd.append('currency', 'USD');
    fd.append('category', 'Damaged on arrival');
    fd.append('title', 'Cracked earcup on arrival');
    fd.append('description', `Order ${orderNum} arrived with cracked right earcup. Requesting full refund.`);
    fd.append('requestedRemedy', 'REFUND');
    fd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}\nTotal: USD 299.00`)],
        `inv-${SHORT_TAG}-01.pdf`,
        { type: 'application/pdf' }
      )
    );
    fd.append('evidence_tags', 'order invoice');
    fd.append('evidence_files', new File([makePngBytes()], `dmg-${SHORT_TAG}-01.png`, { type: 'image/png' }));
    fd.append('evidence_tags', 'product defect photo');

    const subRes = await submitComplaint(makeFormReq('http://localhost/api/complaints/submit', fd, buyerEmail));
    assert.equal(subRes.status, 200);
    const subJson = await subRes.json();
    const caseId = subJson.case.dbId as string;
    const caseNumber = subJson.case.caseNumber as string;
    createdCaseIds.push(caseId);

    // Attach real captured PayPal payment on the case order
    await attachCapturedPaymentToCase({
      caseId,
      orderNumber: orderNum,
      amountMinor: 29900,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Sony WH-1000XM5 Headphones',
    });

    // Verified seller A responds AGREE
    const reqRow = await prisma.sellerEvidenceRequest.findFirst({
      where: { caseId, sellerId: sellerADirId },
    });
    assert.ok(reqRow, 'Seller request should exist for verified seller A');

    const sFd = new FormData();
    sFd.append(
      'payload',
      JSON.stringify({
        stance: 'AGREE',
        summary: 'Carrier transit damage confirmed; we consent to full refund.',
        declarationConfirmed: true,
        idempotencyKey: `t1-agree-${RUN_ID}`,
      })
    );
    const sRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${reqRow.id}/respond`, sFd, sellerAEmail),
      { params: Promise.resolve({ requestId: reqRow.id }) }
    );
    assert.equal(sRes.status, 201);

    // Check Policy Options
    const optRes = await getResolutionOptions(
      makeJsonReq(`http://localhost/api/cases/${caseId}/resolution-options`, { email: managerEmail }),
      { params: Promise.resolve({ caseId }) }
    );
    assert.equal(optRes.status, 200);
    const optJson = await optRes.json();
    assert.equal(optJson.recommendedOption.proposalType, 'FULL_REFUND');
    const refundOpt = optJson.candidateOptions.find((o: { proposalType: string }) => o.proposalType === 'FULL_REFUND');
    assert.equal(refundOpt.isEligible, true);

    // Propose as Investigator -> Buyer accepts -> status is AGREED but authorizationStatus stays PENDING_APPROVAL until Manager authorizes!
    const propRes = await createProposalApi(
      makeJsonReq(`http://localhost/api/cases/${caseId}/resolution-proposals`, {
        method: 'POST',
        email: investigatorEmail,
        body: {
          proposalType: 'FULL_REFUND',
          title: 'Full Refund USD 299.00',
          amountMinor: 29900,
          currency: 'USD',
          reason: 'Transit damage agreed by seller.',
        },
      }),
      { params: Promise.resolve({ caseId }) }
    );
    assert.equal(propRes.status, 201);
    const propJson = await propRes.json();
    const proposalId = propJson.proposal.id as string;
    assert.ok(propJson.proposal.basedOnAssessmentId, 'Proposal links basedOnAssessmentId');
    assert.equal(propJson.proposal.authorizationStatus, 'PENDING_APPROVAL');

    const buyerAcceptRes = await respondProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/respond`, {
        method: 'POST',
        email: buyerEmail,
        body: { response: 'ACCEPTED', comment: 'Confirmed refund destination.' },
      }),
      { params: Promise.resolve({ proposalId }) }
    );
    assert.equal(buyerAcceptRes.status, 200);
    const buyerAcceptJson = await buyerAcceptRes.json();
    assert.equal(buyerAcceptJson.proposalStatus, 'AGREED');
    assert.equal(buyerAcceptJson.authorizationStatus, 'PENDING_APPROVAL');
    assert.equal(buyerAcceptJson.execution.status, 'AWAITING_AUTHORIZATION');

    // Explicit manager authorization
    const revRes = await reviewProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/review`, {
        method: 'POST',
        email: managerEmail,
        body: { decision: 'APPROVED', reviewNotes: 'Approved by RM after verifying BERR.' },
      }),
      { params: Promise.resolve({ proposalId }) }
    );
    assert.equal(revRes.status, 200);
    const revJson = await revRes.json();
    assert.equal(revJson.proposal.authorizationStatus, 'AUTHORIZED');

    // Execute authorized refund (provider returns PENDING)
    const execRes = await executeProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/execute`, {
        method: 'POST',
        email: managerEmail,
      }),
      { params: Promise.resolve({ proposalId }) }
    );
    assert.equal(execRes.status, 200);
    const execJson = await execRes.json();
    assert.equal(execJson.execution.status, 'PENDING');
    assert.equal(execJson.execution.resolved, false, 'Case must NOT be RESOLVED while refund is PENDING');

    const midCase = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    assert.equal(midCase?.status, CaseStatus.EXECUTING_REFUND);

    const midRefund = await prisma.refundTransaction.findUnique({ where: { id: execJson.execution.refundId } });
    assert.equal(midRefund?.status, 'PENDING');
    assert.ok(midRefund?.paypalRefundId);

    // Deliver PayPal webhook PAYMENT.CAPTURE.REFUND.COMPLETED
    const webhookId = `WH-REF-DONE-${RUN_ID}`;
    createdWebhookEventIds.push(webhookId);
    const whRes = await WebhookProcessingService.processEvent({
      id: webhookId,
      event_type: 'PAYMENT.CAPTURE.REFUND.COMPLETED',
      resource: {
        id: midRefund.paypalRefundId,
        status: 'COMPLETED',
        amount: { currency_code: 'USD', value: '299.00' },
      },
    });
    assert.equal(whRes.status, 'PROCESSED');

    const finalCase = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    const finalProposal = await prisma.resolutionProposal.findUnique({ where: { id: proposalId } });
    const finalRefund = await prisma.refundTransaction.findUnique({ where: { id: midRefund.id } });
    assert.equal(finalRefund?.status, 'COMPLETED');
    assert.equal(finalProposal?.status, 'COMPLETED');
    assert.equal(finalCase?.status, CaseStatus.RESOLVED);

    // Buyer detail reflects COMPLETED refund and timeline
    const buyerDetail = await getComplaintDetailApi(
      makeJsonReq(`http://localhost/api/complaints/${caseNumber}`, { email: buyerEmail }),
      { params: Promise.resolve({ caseId: caseNumber }) }
    );
    assert.equal(buyerDetail.status, 200);
    const buyerJson = await buyerDetail.json();
    assert.equal(buyerJson.resolutionSummary.isCompleted, true);
    assert.equal(buyerJson.resolutionSummary.refundDetails.status, 'COMPLETED');

    const buyerNotifs = await prisma.notificationMessage.findMany({ where: { userId: buyerId } });
    assert.ok(buyerNotifs.some((n) => n.title.includes('Refund Completed') && n.body.includes('299.00')));
  });

  test('Test 2 — Clear Replacement: Dispatch stays EXECUTING_REPLACEMENT until Delivery Confirmation -> RESOLVED', async () => {
    controllableProvider.refundMode = 'COMPLETED';
    const orderNum = `AMZ-REP-${SHORT_TAG}-02`;

    const fd = new FormData();
    fd.append('platform', 'Amazon');
    fd.append('orderId', orderNum);
    fd.append('productName', 'Samsung 990 PRO SSD 1TB');
    fd.append('amount', '159');
    fd.append('currency', 'USD');
    fd.append('category', 'Wrong item delivered');
    fd.append('title', 'Received 512GB instead of 1TB SSD');
    fd.append('description', `Order ${orderNum} delivered wrong 512GB drive instead of 1TB. Want replacement.`);
    fd.append('requestedRemedy', 'REPLACEMENT');
    fd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}\nItem: Samsung 990 PRO 1TB`)],
        `inv-${SHORT_TAG}-02.pdf`,
        { type: 'application/pdf' }
      )
    );
    fd.append('evidence_tags', 'order invoice');
    fd.append('evidence_files', new File([makePngBytes()], `wrong-${SHORT_TAG}-02.png`, { type: 'image/png' }));
    fd.append('evidence_tags', 'wrong variant photo');

    const subRes = await submitComplaint(makeFormReq('http://localhost/api/complaints/submit', fd, buyerEmail));
    assert.equal(subRes.status, 200);
    const { case: cInfo } = await subRes.json();
    const caseId = cInfo.dbId as string;
    const caseNumber = cInfo.caseNumber as string;
    createdCaseIds.push(caseId);

    const { order } = await attachCapturedPaymentToCase({
      caseId,
      orderNumber: orderNum,
      amountMinor: 15900,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Samsung 990 PRO SSD 1TB',
      sku: 'MZ-V9P1T0',
    });

    // Attach an ALREADY DELIVERED original parcel passport (must NOT falsely mark replacement completed!)
    await prisma.packagePassport.create({
      data: {
        packageNumber: `PKG-ORIG-${SHORT_TAG}`,
        merchantOrganizationId: sellerAOrgId,
        orderId: order.id,
        status: 'DELIVERED',
        deliveredAt: new Date(),
        qrToken: `QR-${SHORT_TAG}-${RUN_ID}`,
        integrityHash: `hash-${SHORT_TAG}-${RUN_ID}`,
      },
    });

    const reqRow = await prisma.sellerEvidenceRequest.findFirst({ where: { caseId, sellerId: sellerADirId } });
    assert.ok(reqRow);

    const sFd = new FormData();
    sFd.append(
      'payload',
      JSON.stringify({
        stance: 'AGREE',
        summary: 'Pick-bin mismatch verified. Will ship replacement 1TB unit.',
        declarationConfirmed: true,
        idempotencyKey: `t2-agree-${RUN_ID}`,
      })
    );
    const sRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${reqRow.id}/respond`, sFd, sellerAEmail),
      { params: Promise.resolve({ requestId: reqRow.id }) }
    );
    assert.equal(sRes.status, 201);

    const evalRes = await ResolutionEngine.evaluateCase(caseId);
    assert.equal(evalRes.recommendedOption.proposalType, 'REPLACEMENT');
    const repOpt = evalRes.candidateOptions.find((o) => o.proposalType === 'REPLACEMENT');
    assert.equal(repOpt?.isEligible, true);

    const propRes = await createProposalApi(
      makeJsonReq(`http://localhost/api/cases/${caseId}/resolution-proposals`, {
        method: 'POST',
        email: adminEmail,
        body: {
          proposalType: 'REPLACEMENT',
          title: 'Dispatch Replacement 1TB SSD',
          reason: 'Buyer requested replacement and seller agreed variant mismatch.',
        },
      }),
      { params: Promise.resolve({ caseId }) }
    );
    assert.equal(propRes.status, 201);
    const proposalId = (await propRes.json()).proposal.id as string;

    // Buyer accepts -> RM reviews & authorizes -> execute creates ReplacementFulfillment
    await respondProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/respond`, {
        method: 'POST',
        email: buyerEmail,
        body: { response: 'ACCEPTED' },
      }),
      { params: Promise.resolve({ proposalId }) }
    );

    const authRes = await reviewProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/review`, {
        method: 'POST',
        email: managerEmail,
        body: { decision: 'APPROVED', executeOnApprove: true },
      }),
      { params: Promise.resolve({ proposalId }) }
    );
    assert.equal(authRes.status, 200);
    const authJson = await authRes.json();
    const fulfillmentId = authJson.execution.replacementFulfillmentId as string;
    assert.ok(fulfillmentId, 'ReplacementFulfillment must be created upon execution');

    // Case must be EXECUTING_REPLACEMENT (NOT RESOLVED yet) & buyer must NOT see isCompleted
    let midCase = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    assert.equal(midCase?.status, CaseStatus.EXECUTING_REPLACEMENT);
    let midBuyer = await BuyerTrackingService.getBuyerComplaintDetail(getBuyerAuthUser(), caseNumber);
    assert.equal(midBuyer?.resolutionSummary.isCompleted, false);
    assert.equal(midBuyer?.resolutionSummary.replacementDetails?.status, 'REQUESTED_FROM_SELLER');

    // Seller confirms stock
    const confirmRes = await actReplacementApi(
      makeJsonReq(`http://localhost/api/replacements/${fulfillmentId}`, {
        method: 'POST',
        email: sellerAEmail,
        body: { action: 'SELLER_CONFIRM', confirmedSku: 'MZ-V9P1T0' },
      }),
      { params: Promise.resolve({ fulfillmentId }) }
    );
    assert.equal(confirmRes.status, 200);
    assert.equal((await confirmRes.json()).fulfillment.status, 'SELLER_CONFIRMED');

    // Seller dispatches replacement
    const dispatchRes = await actReplacementApi(
      makeJsonReq(`http://localhost/api/replacements/${fulfillmentId}`, {
        method: 'POST',
        email: sellerAEmail,
        body: {
          action: 'DISPATCH',
          carrierName: 'BlueDart Express',
          trackingNumber: `BD-${SHORT_TAG}-999`,
          sealNumber: `SEAL-${SHORT_TAG}`,
        },
      }),
      { params: Promise.resolve({ fulfillmentId }) }
    );
    assert.equal(dispatchRes.status, 200);
    const dispJson = await dispatchRes.json();
    assert.equal(dispJson.fulfillment.status, 'DISPATCHED');

    // STILL NOT RESOLVED while IN TRANSIT / DISPATCHED!
    midCase = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    assert.equal(midCase?.status, CaseStatus.EXECUTING_REPLACEMENT);
    midBuyer = await BuyerTrackingService.getBuyerComplaintDetail(getBuyerAuthUser(), caseNumber);
    assert.equal(midBuyer?.resolutionSummary.isCompleted, false);
    assert.equal(midBuyer?.resolutionSummary.replacementDetails?.trackingNumber, `BD-${SHORT_TAG}-999`);

    // Delivery confirmation finally marks ReplacementFulfillment COMPLETED, Proposal COMPLETED, Case RESOLVED!
    const deliverRes = await actReplacementApi(
      makeJsonReq(`http://localhost/api/replacements/${fulfillmentId}`, {
        method: 'POST',
        email: buyerEmail,
        body: { action: 'CONFIRM_DELIVERY', deliveryNote: 'Sealed replacement received and verified.' },
      }),
      { params: Promise.resolve({ fulfillmentId }) }
    );
    assert.equal(deliverRes.status, 200);
    assert.equal((await deliverRes.json()).fulfillment.status, 'COMPLETED');

    const finalCase = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    const finalProp = await prisma.resolutionProposal.findUnique({ where: { id: proposalId } });
    assert.equal(finalProp?.status, 'COMPLETED');
    assert.equal(finalCase?.status, CaseStatus.RESOLVED);
  });

  test('Test 3 — Conflicting Evidence: BERR flags CONTESTED -> Auto-Remedy blocked without Manager Escalation Override', async () => {
    const orderNum = `AMZ-CON-${SHORT_TAG}-03`;

    const fd = new FormData();
    fd.append('platform', 'Amazon');
    fd.append('orderId', orderNum);
    fd.append('productName', 'Samsung 990 PRO SSD 1TB');
    fd.append('amount', '159');
    fd.append('currency', 'USD');
    fd.append('category', 'Wrong item delivered');
    fd.append('title', 'Received 512GB variant in sealed box');
    fd.append('description', `Ordered 1TB SSD but box contains 512GB wrong item.`);
    fd.append('requestedRemedy', 'REFUND');
    fd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}`)],
        `inv-${SHORT_TAG}-03.pdf`,
        { type: 'application/pdf' }
      )
    );
    fd.append('evidence_tags', 'order invoice');
    fd.append('evidence_files', new File([makePngBytes()], `wrong-${SHORT_TAG}-03.png`, { type: 'image/png' }));
    fd.append('evidence_tags', 'product defect photo');

    const subRes = await submitComplaint(makeFormReq('http://localhost/api/complaints/submit', fd, buyerEmail));
    assert.equal(subRes.status, 200);
    const caseId = (await subRes.json()).case.dbId as string;
    createdCaseIds.push(caseId);

    await attachCapturedPaymentToCase({
      caseId,
      orderNumber: orderNum,
      amountMinor: 15900,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Samsung 990 PRO SSD 1TB',
    });

    const reqRow = await prisma.sellerEvidenceRequest.findFirst({ where: { caseId, sellerId: sellerADirId } });
    assert.ok(reqRow);

    const sFd = new FormData();
    sFd.append(
      'payload',
      JSON.stringify({
        stance: 'DISAGREE',
        summary: 'We deny the claim. Outbound warehouse scan confirms exact 1TB serial SKU-990PRO-1TB weight 420g dispatched intact.',
        declarationConfirmed: true,
        idempotencyKey: `t3-dispute-${RUN_ID}`,
        fileMetadata: [
          {
            evidenceType: 'TRACKING_INFO',
            description: 'Warehouse dispatch manifest scan',
          },
        ],
      })
    );
    sFd.append(
      'files',
      new File(
        [makePdfBytes(`Warehouse Dispatch Manifest Order: ${orderNum} SKU: MZ-V9P1T0 1TB Weight: 420g Verified`)],
        `manifest-${SHORT_TAG}-03.pdf`,
        { type: 'application/pdf' }
      )
    );

    const sRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${reqRow.id}/respond`, sFd, sellerAEmail),
      { params: Promise.resolve({ requestId: reqRow.id }) }
    );
    assert.equal(sRes.status, 201);

    const berrHist = await BerrV2Service.getAssessmentHistory(caseId);
    assert.ok(berrHist.latest);
    assert.ok(
      berrHist.latest.findings.some((f) => f.classification === 'CONTESTED') ||
        berrHist.latest.overallStatus === 'COMPLETED_WITH_CONFLICTS' ||
        berrHist.latest.overallStatus === 'HUMAN_REVIEW_REQUIRED',
      `Expected CONTESTED / HUMAN_REVIEW_REQUIRED, got ${berrHist.latest.overallStatus}`
    );

    const evalRes = await ResolutionEngine.evaluateCase(caseId);
    const fullRefundOpt = evalRes.candidateOptions.find((o) => o.proposalType === 'FULL_REFUND');
    assert.equal(fullRefundOpt?.isEligible, false, 'FULL_REFUND must not be auto-eligible on CONTESTED evidence');
    assert.equal(evalRes.recommendedOption.proposalType, 'HUMAN_REVIEW');

    // Create proposal anyway -> authorization without explicit override reviewNotes MUST be rejected!
    const prop = await ProposalWorkflowService.createProposal({
      caseId,
      proposedById: adminId,
      proposalType: 'FULL_REFUND',
      title: 'Contested Refund Attempt',
      description: 'Test contested guard',
      amountMinor: 15900,
      currency: 'USD',
      reason: 'Testing human override requirement on contested evidence',
    });

    const emptyNotesApprove = await reviewProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/review`, {
        method: 'POST',
        email: managerEmail,
        body: { decision: 'APPROVED', reviewNotes: '' },
      }),
      { params: Promise.resolve({ proposalId: prop.id }) }
    );
    assert.equal(emptyNotesApprove.status, 400);

    // Explicit manager override justification succeeds
    const overrideApprove = await reviewProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/review`, {
        method: 'POST',
        email: managerEmail,
        body: {
          decision: 'APPROVED',
          reviewNotes: 'Manager override after reviewing serial logs in favor of buyer.',
        },
      }),
      { params: Promise.resolve({ proposalId: prop.id }) }
    );
    assert.equal(overrideApprove.status, 200);
    assert.equal((await overrideApprove.json()).proposal.authorizationStatus, 'AUTHORIZED');
  });

  test('Test 4 — Missing Seller Evidence: Financial Remedy Blocked Until Seller Responds', async () => {
    const orderNum = `AMZ-MSE-${SHORT_TAG}-04`;

    const fd = new FormData();
    fd.append('platform', 'Amazon');
    fd.append('orderId', orderNum);
    fd.append('productName', 'Mechanical Keyboard K8');
    fd.append('amount', '99');
    fd.append('currency', 'USD');
    fd.append('category', 'Missing parts');
    fd.append('title', 'Missing keycap puller and cable');
    fd.append('description', 'Seller has not yet supplied packing proof.');
    fd.append('requestedRemedy', 'REFUND');
    fd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}`)],
        `inv-${SHORT_TAG}-04.pdf`,
        { type: 'application/pdf' }
      )
    );
    fd.append('evidence_tags', 'order invoice');

    const subRes = await submitComplaint(makeFormReq('http://localhost/api/complaints/submit', fd, buyerEmail));
    assert.equal(subRes.status, 200);
    const caseId = (await subRes.json()).case.dbId as string;
    createdCaseIds.push(caseId);

    await attachCapturedPaymentToCase({
      caseId,
      orderNumber: orderNum,
      amountMinor: 9900,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Mechanical Keyboard K8',
    });

    // Seller request is open, zero responses!
    const evalRes = await ResolutionEngine.evaluateCase(caseId);
    assert.equal(evalRes.berrSummary?.sellerEvidenceMissing, true);
    const refundOpt = evalRes.candidateOptions.find((o) => o.proposalType === 'FULL_REFUND');
    const repOpt = evalRes.candidateOptions.find((o) => o.proposalType === 'REPLACEMENT');
    assert.equal(refundOpt?.isEligible, false, 'Refund cannot be auto-eligible without seller submission');
    assert.equal(repOpt?.isEligible, false, 'Replacement cannot be auto-eligible without seller submission');
    assert.ok(
      evalRes.recommendedOption.proposalType === 'INFORMATION_REQUEST' ||
        evalRes.recommendedOption.proposalType === 'HUMAN_REVIEW'
    );
  });

  test('Test 5 — Insufficient Buyer Evidence: INSUFFICIENT_BEG_DATA blocks Refund & Replacement Authorization', async () => {
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-INSUF-${SHORT_TAG}`,
        title: 'Bare claim with zero buyer evidence',
        description: 'Claiming defect without invoice or photo.',
        category: CaseCategory.DAMAGED_GOODS,
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 5000,
        currency: 'USD',
        status: CaseStatus.SUBMITTED,
      },
    });
    createdCaseIds.push(c.id);

    await BegSyncService.handleDomainEvent({
      caseId: c.id,
      triggerEvent: 'COMPLAINT_CREATED',
      actorId: buyerId,
      rerunBerr: false,
    });
    const berr = await BerrV2Service.evaluateCase(c.id, { createdById: buyerId });
    assert.equal(berr.assessmentStatus, 'INSUFFICIENT_BEG_DATA');

    const evalRes = await ResolutionEngine.evaluateCase(c.id);
    assert.equal(evalRes.berrSummary?.status, 'INSUFFICIENT_BEG_DATA');
    assert.equal(evalRes.candidateOptions.find((o) => o.proposalType === 'FULL_REFUND')?.isEligible, false);
    assert.equal(evalRes.candidateOptions.find((o) => o.proposalType === 'REPLACEMENT')?.isEligible, false);

    // Even if someone manually persists a proposal, authorization gate blocks APPROVE -> 400!
    const prop = await ProposalWorkflowService.createProposal({
      caseId: c.id,
      proposedById: adminId,
      proposalType: 'FULL_REFUND',
      title: 'Premature Refund',
      description: 'Should be blocked by INSUFFICIENT_BEG_DATA',
      amountMinor: 5000,
      currency: 'USD',
      reason: 'Premature attempt',
    });

    const revRes = await reviewProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/review`, {
        method: 'POST',
        email: managerEmail,
        body: { decision: 'APPROVED', reviewNotes: 'Trying override on insufficient BEG data' },
      }),
      { params: Promise.resolve({ proposalId: prop.id }) }
    );
    assert.equal(revRes.status, 400);
    const revErr = await revRes.json();
    assert.ok(revErr.error.includes('INSUFFICIENT_BEG_DATA'));
  });

  test('Test 6 — Refund Already Initiated / Completed: Duplicate Proposals & Refunds Blocked', async () => {
    controllableProvider.refundMode = 'PENDING';
    const orderNum = `AMZ-DUPREF-${SHORT_TAG}-06`;

    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-DUP-${SHORT_TAG}`,
        title: 'Duplicate refund prevention test',
        description: 'Order already has an active pending refund.',
        category: CaseCategory.DAMAGED_GOODS,
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 12000,
        currency: 'USD',
        status: CaseStatus.EXECUTING_REFUND,
      },
    });
    createdCaseIds.push(c.id);

    const { payment } = await attachCapturedPaymentToCase({
      caseId: c.id,
      orderNumber: orderNum,
      amountMinor: 12000,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Noise Canceling Earbuds',
    });

    await prisma.refundTransaction.create({
      data: {
        paymentId: payment.id,
        refundRequestId: `req-active-${SHORT_TAG}`,
        paypalRefundId: `PP-ACTIVE-${SHORT_TAG}`,
        amountMinor: 12000,
        currency: 'USD',
        status: 'PENDING',
        reason: 'Already initiated earlier',
        requestedById: managerId,
        approvedById: managerId,
      },
    });

    const evalRes = await ResolutionEngine.evaluateCase(c.id);
    assert.equal(evalRes.activeRefund?.hasActivePendingRefund, true);
    assert.equal(evalRes.candidateOptions.find((o) => o.proposalType === 'FULL_REFUND')?.isEligible, false);

    await assert.rejects(
      () =>
        ProposalWorkflowService.createProposal({
          caseId: c.id,
          proposedById: adminId,
          proposalType: 'FULL_REFUND',
          title: 'Second Full Refund',
          description: 'Must be rejected',
          amountMinor: 12000,
          currency: 'USD',
          reason: 'Duplicate attempt',
        }),
      /active pending or full refund already exists/i
    );
  });

  test('Test 7 — New Evidence After Initial Assessment: Marks v1 Stale, Produces v2 & Unlocks Eligibility', async () => {
    const orderNum = `AMZ-NEW-${SHORT_TAG}-07`;
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-V2-${SHORT_TAG}`,
        title: 'Monitor dead pixel cluster',
        description: `Order ${orderNum} arrived with dead pixel cluster.`,
        category: CaseCategory.NOT_AS_DESCRIBED,
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 25000,
        currency: 'USD',
        status: CaseStatus.SUBMITTED,
      },
    });
    createdCaseIds.push(c.id);

    await BegSyncService.handleDomainEvent({
      caseId: c.id,
      triggerEvent: 'COMPLAINT_CREATED',
      actorId: buyerId,
      rerunBerr: false,
    });
    const v1 = await BerrV2Service.evaluateCase(c.id, { createdById: buyerId });
    assert.equal(v1.version, 1);
    assert.equal(v1.assessmentStatus, 'INSUFFICIENT_BEG_DATA');

    // Now captured payment & buyer invoice + photo arrive -> triggers seller identification + outreach + BEG sync + BERR v2!
    await attachCapturedPaymentToCase({
      caseId: c.id,
      orderNumber: orderNum,
      amountMinor: 25000,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: '4K Monitor',
    });

    const evFd = new FormData();
    evFd.append('orderId', orderNum);
    evFd.append('platform', 'Amazon');
    evFd.append('productName', '4K Monitor');
    evFd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}\nTotal: USD 250.00`)],
        `inv-${SHORT_TAG}-07.pdf`,
        { type: 'application/pdf' }
      )
    );
    evFd.append('evidence_tags', 'order invoice');
    evFd.append('evidence_files', new File([makePngBytes()], `px-${SHORT_TAG}-07.png`, { type: 'image/png' }));
    evFd.append('evidence_tags', 'product defect photo');

    const upRes = await addComplaintEvidence(
      makeFormReq(`http://localhost/api/complaints/${c.caseNumber}/evidence`, evFd, buyerEmail),
      { params: Promise.resolve({ caseId: c.caseNumber }) }
    );
    assert.equal(upRes.status, 200);

    // Mark uploaded buyer evidence VERIFIED so EvidenceGuard / BERR corroborates
    await prisma.evidence.updateMany({
      where: { caseId: c.id, verificationStatus: { not: VerificationStatus.VERIFIED } },
      data: { verificationStatus: VerificationStatus.VERIFIED },
    });

    const reqRow = await prisma.sellerEvidenceRequest.findFirst({ where: { caseId: c.id, sellerId: sellerADirId } });
    assert.ok(reqRow, 'Seller request should be dispatched once valid invoice is uploaded');

    const sFd = new FormData();
    sFd.append(
      'payload',
      JSON.stringify({
        stance: 'AGREE',
        summary: 'Dead pixel warranty defect acknowledged for refund.',
        declarationConfirmed: true,
        idempotencyKey: `t7-agree-${RUN_ID}`,
      })
    );
    const sRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${reqRow.id}/respond`, sFd, sellerAEmail),
      { params: Promise.resolve({ requestId: reqRow.id }) }
    );
    assert.equal(sRes.status, 201);

    const assessments = await prisma.berrAssessmentRecord.findMany({
      where: { caseId: c.id },
      orderBy: { version: 'asc' },
    });
    assert.ok(assessments.length >= 2, 'Expected preserved v1 plus newly generated v2+ assessment');
    assert.equal(assessments[0].version, 1);
    assert.equal(assessments[0].isStale, true, 'v1 must be marked stale upon new evidence');
    const latest = assessments[assessments.length - 1];
    assert.ok(latest.version >= 2);
    assert.equal(latest.status, 'COMPLETED');

    const evalRes = await ResolutionEngine.evaluateCase(c.id);
    assert.equal(evalRes.candidateOptions.find((o) => o.proposalType === 'FULL_REFUND')?.isEligible, true);
  });

  test('Test 8 — Authorization Denied: Rejected Proposal Blocks Execution & Keeps Case IN_REVIEW', async () => {
    const orderNum = `AMZ-DEN-${SHORT_TAG}-08`;
    const fd = new FormData();
    fd.append('platform', 'Amazon');
    fd.append('orderId', orderNum);
    fd.append('productName', 'Gaming Headset');
    fd.append('amount', '80');
    fd.append('currency', 'USD');
    fd.append('category', 'Damaged on arrival');
    fd.append('title', 'Bent microphone boom');
    fd.append('description', 'Microphone arrives slightly bent.');
    fd.append('requestedRemedy', 'REFUND');
    fd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}`)],
        `inv-${SHORT_TAG}-08.pdf`,
        { type: 'application/pdf' }
      )
    );
    fd.append('evidence_tags', 'order invoice');

    const subRes = await submitComplaint(makeFormReq('http://localhost/api/complaints/submit', fd, buyerEmail));
    assert.equal(subRes.status, 200);
    const subJson = await subRes.json();
    const caseId = subJson.case.dbId as string;
    const caseNumber = subJson.case.caseNumber as string;
    createdCaseIds.push(caseId);

    const { payment } = await attachCapturedPaymentToCase({
      caseId,
      orderNumber: orderNum,
      amountMinor: 8000,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Gaming Headset',
    });

    const propRes = await createProposalApi(
      makeJsonReq(`http://localhost/api/cases/${caseId}/resolution-proposals`, {
        method: 'POST',
        email: investigatorEmail,
        body: {
          proposalType: 'FULL_REFUND',
          title: 'Refund USD 80.00',
          amountMinor: 8000,
          currency: 'USD',
          reason: 'Submitted for manager authorization check',
        },
      }),
      { params: Promise.resolve({ caseId }) }
    );
    assert.equal(propRes.status, 201);
    const proposalId = (await propRes.json()).proposal.id as string;

    const denyRes = await reviewProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/review`, {
        method: 'POST',
        email: managerEmail,
        body: { decision: 'REJECTED', reviewNotes: 'Calibration evidence insufficient for full refund.' },
      }),
      { params: Promise.resolve({ proposalId }) }
    );
    assert.equal(denyRes.status, 200);
    const denyJson = await denyRes.json();
    assert.equal(denyJson.proposal.authorizationStatus, 'REJECTED');
    assert.equal(denyJson.proposal.status, 'REJECTED');
    assert.ok(denyJson.proposal.denialReason.includes('Calibration evidence'));

    const cAfter = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    assert.equal(cAfter?.status, CaseStatus.IN_REVIEW);

    const deniedEvt = await prisma.caseEvent.findFirst({
      where: { caseId, eventType: 'AUTHORIZATION_DENIED' },
    });
    assert.ok(deniedEvt);

    // Execution must be strictly blocked on a denied proposal!
    const execAttempt = await executeProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${proposalId}/execute`, {
        method: 'POST',
        email: managerEmail,
      }),
      { params: Promise.resolve({ proposalId }) }
    );
    assert.equal(execAttempt.status, 400);

    const refunds = await prisma.refundTransaction.findMany({ where: { paymentId: payment.id } });
    assert.equal(refunds.length, 0, 'No refund may ever be executed on a denied proposal');

    const buyerView = await BuyerTrackingService.getBuyerComplaintDetail(getBuyerAuthUser(), caseNumber);
    assert.equal(buyerView?.resolutionSummary.approvalStatus, 'Authorization denied');
  });

  test('Test 9 — Wrong Seller Association & Reassignment: Cancels Wrong Seller Request, Updates Org & Rebuilds BEG/BERR', async () => {
    const orderNum = `AMZ-WRS-${SHORT_TAG}-09`;
    const fd = new FormData();
    fd.append('platform', 'Amazon');
    fd.append('orderId', orderNum);
    fd.append('productName', 'USB-C Hub');
    fd.append('amount', '60');
    fd.append('currency', 'USD');
    fd.append('category', 'Damaged on arrival');
    fd.append('title', 'Initially linked wrong seller');
    fd.append('description', 'Wrong seller initially identified on invoice.');
    fd.append('requestedRemedy', 'REFUND');
    fd.append(
      'evidence_files',
      new File(
        [makePdfBytes(`Sold By: AuditAlpha Electronics Pvt Ltd ${SHORT_TAG}\nGSTIN: ${sellerAGstin}\nOrder ID: ${orderNum}`)],
        `inv-${SHORT_TAG}-09.pdf`,
        { type: 'application/pdf' }
      )
    );
    fd.append('evidence_tags', 'order invoice');

    const subRes = await submitComplaint(makeFormReq('http://localhost/api/complaints/submit', fd, buyerEmail));
    assert.equal(subRes.status, 200);
    const caseId = (await subRes.json()).case.dbId as string;
    createdCaseIds.push(caseId);

    const wrongMatch = await prisma.sellerIdentityMatch.findFirst({ where: { caseId } });
    const wrongReq = await prisma.sellerEvidenceRequest.findFirst({ where: { caseId, sellerId: sellerADirId } });
    assert.ok(wrongMatch && wrongReq);

    // Reassign to True Seller B
    const reassRes = await resolveSellerMatchApi(
      makeJsonReq(`http://localhost/api/cases/${caseId}/seller-workflow`, {
        method: 'PATCH',
        email: adminEmail,
        body: {
          sellerMatchId: wrongMatch.id,
          sellerId: sellerBDirId,
          reviewNotes: 'Corrected seller assignment to AuditBeta Supply Co.',
        },
      }),
      { params: Promise.resolve({ caseId }) }
    );
    assert.equal(reassRes.status, 200);

    const reqAAfter = await prisma.sellerEvidenceRequest.findUnique({ where: { id: wrongReq.id } });
    assert.equal(reqAAfter?.status, 'CANCELLED', 'Wrong seller request must be CANCELLED');

    const updatedCase = await prisma.caseRecord.findUnique({ where: { id: caseId } });
    assert.equal(updatedCase?.organizationId, sellerBOrgId, 'Case organizationId must update to True Seller B');

    const reassignEvt = await prisma.caseEvent.findFirst({ where: { caseId, eventType: 'SELLER_REASSIGNED' } });
    assert.ok(reassignEvt);

    // Wrong Seller A is blocked from responding to cancelled request
    const wrongRespondFd = new FormData();
    wrongRespondFd.append(
      'payload',
      JSON.stringify({
        stance: 'DISAGREE',
        summary: 'Wrong seller hijack attempt',
        declarationConfirmed: true,
        idempotencyKey: `t9-wrong-${RUN_ID}`,
      })
    );
    const wrongRespondRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${wrongReq.id}/respond`, wrongRespondFd, sellerAEmail),
      { params: Promise.resolve({ requestId: wrongReq.id }) }
    );
    assert.ok(wrongRespondRes.status >= 400);

    // True Seller B receives new active request and can respond
    const trueReq = await prisma.sellerEvidenceRequest.findFirst({
      where: { caseId, sellerId: sellerBDirId, status: { not: 'CANCELLED' } },
    });
    assert.ok(trueReq, 'Fresh request must be created for True Seller B');

    // BEG excludes cancelled request reqA
    const syncGraph = await BegPersistenceService.syncCaseGraph(caseId, 'VERIFY_REASSIGNMENT', adminId);
    const nodeIds = new Set(syncGraph.graph.nodes.map((n) => n.id));
    assert.equal(nodeIds.has(`seller_req:${wrongReq.id}`), false, 'Cancelled wrong-seller request excluded from active BEG');
    assert.equal(nodeIds.has(`seller_req:${trueReq.id}`), true, 'New True Seller B request present in BEG');

    const trueRespondFd = new FormData();
    trueRespondFd.append(
      'payload',
      JSON.stringify({
        stance: 'AGREE',
        summary: 'True Seller B accepts liability.',
        declarationConfirmed: true,
        idempotencyKey: `t9-true-${RUN_ID}`,
      })
    );
    const trueRespondRes = await respondSellerRequest(
      makeFormReq(`http://localhost/api/seller/requests/${trueReq.id}/respond`, trueRespondFd, sellerBEmail),
      { params: Promise.resolve({ requestId: trueReq.id }) }
    );
    assert.equal(trueRespondRes.status, 201);
  });

  test('Test 10 — Duplicate / Concurrent Execution Protection (Mutex & Unique Replacement Guard)', async () => {
    controllableProvider.refundMode = 'DELAYED_COMPLETED';
    controllableProvider.refundCalls = 0;

    // 10A: Concurrent Refund Execution
    const cRef = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-CONCREF-${SHORT_TAG}`,
        title: 'Concurrent refund guard test',
        description: 'Parallel execute calls on same refund proposal',
        category: CaseCategory.DAMAGED_GOODS,
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 10000,
        currency: 'USD',
        status: CaseStatus.IN_REVIEW,
      },
    });
    createdCaseIds.push(cRef.id);

    const { payment } = await attachCapturedPaymentToCase({
      caseId: cRef.id,
      orderNumber: `AMZ-CONCREF-${SHORT_TAG}`,
      amountMinor: 10000,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Concurrency Widget',
    });

    const refProp = await prisma.resolutionProposal.create({
      data: {
        caseId: cRef.id,
        organizationId: sellerAOrgId,
        proposedById: adminId,
        proposalType: 'FULL_REFUND',
        title: 'Concurrent Refund Protection',
        description: 'Verify single payout under race',
        amountMinor: 10000,
        currency: 'USD',
        reason: 'Mutex check',
        status: 'AGREED',
        authorizationStatus: 'AUTHORIZED',
        authorizedById: managerId,
        authorizedAt: new Date(),
      },
    });

    const [r1, r2] = await Promise.all([
      executeProposalApi(
        makeJsonReq(`http://localhost/api/resolution-proposals/${refProp.id}/execute`, {
          method: 'POST',
          email: managerEmail,
        }),
        { params: Promise.resolve({ proposalId: refProp.id }) }
      ),
      executeProposalApi(
        makeJsonReq(`http://localhost/api/resolution-proposals/${refProp.id}/execute`, {
          method: 'POST',
          email: managerEmail,
        }),
        { params: Promise.resolve({ proposalId: refProp.id }) }
      ),
    ]);
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);

    const refundRows = await prisma.refundTransaction.findMany({ where: { paymentId: payment.id } });
    assert.equal(refundRows.length, 1, 'Exactly ONE RefundTransaction allowed across concurrent executions');
    assert.equal(controllableProvider.refundCalls, 1, 'Provider refundCapture must fire exactly ONCE');

    // 10B: Concurrent Replacement Initiation
    const cRep = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-CONCREP-${SHORT_TAG}`,
        title: 'Concurrent replacement initiation guard',
        description: 'Parallel createReplacementApi calls',
        category: 'NOT_AS_DESCRIBED',
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 7500,
        currency: 'USD',
        status: CaseStatus.IN_REVIEW,
      },
    });
    createdCaseIds.push(cRep.id);

    const repProp = await prisma.resolutionProposal.create({
      data: {
        caseId: cRep.id,
        organizationId: sellerAOrgId,
        proposedById: adminId,
        proposalType: 'REPLACEMENT',
        title: 'Concurrent Replacement Protection',
        description: 'Verify single ReplacementFulfillment under race',
        currency: 'USD',
        reason: 'Unique proposalId check',
        status: 'AGREED',
        authorizationStatus: 'AUTHORIZED',
        authorizedById: managerId,
        authorizedAt: new Date(),
      },
    });

    const [rep1, rep2] = await Promise.all([
      createReplacementApi(
        makeJsonReq('http://localhost/api/replacements', {
          method: 'POST',
          email: managerEmail,
          body: { proposalId: repProp.id },
        })
      ),
      createReplacementApi(
        makeJsonReq('http://localhost/api/replacements', {
          method: 'POST',
          email: managerEmail,
          body: { proposalId: repProp.id },
        })
      ),
    ]);
    assert.ok([200, 201].includes(rep1.status));
    assert.ok([200, 201].includes(rep2.status));

    const fulfillRows = await prisma.replacementFulfillment.findMany({ where: { proposalId: repProp.id } });
    assert.equal(fulfillRows.length, 1, 'Exactly ONE ReplacementFulfillment allowed per proposal');
  });

  test('Test 11 — Unauthorized User Attack Matrix: Buyer, Foreign Tenant Merchant, and Org VIEWER Strictly Blocked (403)', async () => {
    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-RBAC-${SHORT_TAG}`,
        title: 'RBAC isolation & privilege escalation test',
        description: 'Tests buyer/foreign merchant/viewer blocks',
        category: CaseCategory.DAMAGED_GOODS,
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 9000,
        currency: 'USD',
        status: CaseStatus.IN_REVIEW,
      },
    });
    createdCaseIds.push(c.id);

    const { payment } = await attachCapturedPaymentToCase({
      caseId: c.id,
      orderNumber: `AMZ-RBAC-${SHORT_TAG}`,
      amountMinor: 9000,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Security Guard Router',
    });

    const prop = await prisma.resolutionProposal.create({
      data: {
        caseId: c.id,
        organizationId: sellerAOrgId,
        proposedById: adminId,
        proposalType: 'REPLACEMENT',
        title: 'RBAC Protected Replacement',
        description: 'Replacement guard',
        currency: 'USD',
        reason: 'RBAC test',
        status: 'PENDING_BUYER',
        authorizationStatus: 'PENDING_APPROVAL',
      },
    });

    const viewerUser = await prisma.user.findUnique({ where: { email: sellerViewerEmail } });
    assert.ok(viewerUser);

    const [
      buyerReview,
      buyerExecute,
      buyerPropose,
      buyerCreateRep,
      buyerBerrOverride,
      foreignGetProps,
      foreignReview,
      viewerExecute,
      viewerPropose,
      foreignBuyerDetail,
    ] = await Promise.all([
      reviewProposalApi(
        makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/review`, {
          method: 'POST',
          email: buyerEmail,
          body: { decision: 'APPROVED' },
        }),
        { params: Promise.resolve({ proposalId: prop.id }) }
      ),
      executeProposalApi(
        makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/execute`, {
          method: 'POST',
          email: buyerEmail,
        }),
        { params: Promise.resolve({ proposalId: prop.id }) }
      ),
      createProposalApi(
        makeJsonReq(`http://localhost/api/cases/${c.id}/resolution-proposals`, {
          method: 'POST',
          email: buyerEmail,
          body: { proposalType: 'FULL_REFUND', title: 'Hijack', reason: 'Buyer propose hijack' },
        }),
        { params: Promise.resolve({ caseId: c.id }) }
      ),
      createReplacementApi(
        makeJsonReq('http://localhost/api/replacements', {
          method: 'POST',
          email: buyerEmail,
          body: { proposalId: prop.id },
        })
      ),
      reviewBerrApi(
        makeJsonReq(`http://localhost/api/cases/${c.id}/berr-v2/review`, {
          method: 'POST',
          email: buyerEmail,
          body: { action: 'OVERRIDE_CLASSIFICATION', notes: 'Buyer tampering' },
        }),
        { params: Promise.resolve({ caseId: c.id }) }
      ),
      getProposalsApi(
        makeJsonReq(`http://localhost/api/cases/${c.id}/resolution-proposals`, { email: sellerBEmail }),
        { params: Promise.resolve({ caseId: c.id }) }
      ),
      reviewProposalApi(
        makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/review`, {
          method: 'POST',
          email: sellerBEmail,
          body: { decision: 'APPROVED' },
        }),
        { params: Promise.resolve({ proposalId: prop.id }) }
      ),
      executeProposalApi(
        makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/execute`, {
          method: 'POST',
          email: sellerViewerEmail,
        }),
        { params: Promise.resolve({ proposalId: prop.id }) }
      ),
      createProposalApi(
        makeJsonReq(`http://localhost/api/cases/${c.id}/resolution-proposals`, {
          method: 'POST',
          email: sellerViewerEmail,
          body: { proposalType: 'FULL_REFUND', title: 'Viewer Hijack', reason: 'Viewer attempt' },
        }),
        { params: Promise.resolve({ caseId: c.id }) }
      ),
      getComplaintDetailApi(
        makeJsonReq(`http://localhost/api/complaints/${c.caseNumber}`, { email: foreignBuyerEmail }),
        { params: Promise.resolve({ caseId: c.caseNumber }) }
      ),
    ]);

    for (const resp of [
      buyerReview,
      buyerExecute,
      buyerPropose,
      buyerCreateRep,
      buyerBerrOverride,
      foreignGetProps,
      foreignReview,
      viewerExecute,
      viewerPropose,
      foreignBuyerDetail,
    ]) {
      assert.equal(resp.status, 403, `Expected 403 Forbidden, received ${resp.status}`);
    }

    // Viewer cannot invoke RefundService financially directly
    await assert.rejects(
      () =>
        RefundService.executeRefund(
          {
            paymentId: payment.id,
            amountMinor: 9000,
            reason: 'Viewer unauthorized refund',
            idempotencyKey: `viewer-block-${RUN_ID}`,
          },
          {
            id: viewerUser.id,
            email: viewerUser.email,
            name: viewerUser.name,
            fullName: viewerUser.fullName,
            role: viewerUser.role,
            isPlatformAdmin: false,
            isActive: true,
            avatarUrl: null,
            organization: null,
            orgMemberships: [
              {
                organizationId: sellerAOrgId,
                role: OrganizationRole.VIEWER,
                organization: { id: sellerAOrgId, name: 'AuditAlphaStore', slug: 'audit-alpha' },
              },
            ],
          }
        ),
      /Unauthorized/i
    );
  });

  test('Test 12 — Provider Failure Recovery: FAILED Refund Never Resolves Case; Retry Recovers -> COMPLETED & RESOLVED', async () => {
    controllableProvider.refundMode = 'FAIL_THROW';

    const c = await prisma.caseRecord.create({
      data: {
        caseNumber: `RG-FAILREC-${SHORT_TAG}`,
        title: 'Payment provider failure and retry recovery',
        description: 'Simulates provider 503 followed by successful retry.',
        category: CaseCategory.DAMAGED_GOODS,
        buyerId,
        merchantId: adminId,
        organizationId: sellerAOrgId,
        amountMinor: 11000,
        currency: 'USD',
        status: CaseStatus.IN_REVIEW,
      },
    });
    createdCaseIds.push(c.id);

    const { payment } = await attachCapturedPaymentToCase({
      caseId: c.id,
      orderNumber: `AMZ-FAIL-${SHORT_TAG}`,
      amountMinor: 11000,
      currency: 'USD',
      orgId: sellerAOrgId,
      productTitle: 'Studio Microphone',
    });

    const prop = await prisma.resolutionProposal.create({
      data: {
        caseId: c.id,
        organizationId: sellerAOrgId,
        proposedById: adminId,
        proposalType: 'FULL_REFUND',
        title: 'Failure Recovery Full Refund',
        description: 'Refund subject to transient failure',
        amountMinor: 11000,
        currency: 'USD',
        reason: 'Provider outage recovery test',
        status: 'AGREED',
        authorizationStatus: 'AUTHORIZED',
        authorizedById: managerId,
        authorizedAt: new Date(),
      },
    });

    // 1. Execution fails with provider 503
    const failExec = await executeProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/execute`, {
        method: 'POST',
        email: managerEmail,
      }),
      { params: Promise.resolve({ proposalId: prop.id }) }
    );
    assert.equal(failExec.status, 200);
    const failJson = await failExec.json();
    assert.equal(failJson.execution.status, 'FAILED');
    assert.equal(failJson.execution.resolved, false);

    const failedRefundRow = await prisma.refundTransaction.findFirst({ where: { paymentId: payment.id } });
    assert.equal(failedRefundRow?.status, 'FAILED');

    const failedCase = await prisma.caseRecord.findUnique({ where: { id: c.id } });
    assert.notEqual(failedCase?.status, CaseStatus.RESOLVED);
    assert.equal(failedCase?.status, CaseStatus.IN_REVIEW);

    const failedProp = await prisma.resolutionProposal.findUnique({ where: { id: prop.id } });
    assert.equal(failedProp?.authorizationStatus, 'EXECUTION_FAILED');

    const refFailEvt = await prisma.caseEvent.findFirst({ where: { caseId: c.id, eventType: 'REFUND_FAILED' } });
    assert.ok(refFailEvt);

    const buyerMid = await BuyerTrackingService.getBuyerComplaintDetail(getBuyerAuthUser(), c.caseNumber);
    assert.equal(buyerMid?.resolutionSummary.isCompleted, false);
    assert.equal(buyerMid?.resolutionSummary.refundDetails?.status, 'FAILED');

    // 2. Provider recovers -> Retry execution updates FAILED record -> COMPLETED & RESOLVED!
    controllableProvider.refundMode = 'COMPLETED';
    const retryExec = await executeProposalApi(
      makeJsonReq(`http://localhost/api/resolution-proposals/${prop.id}/execute`, {
        method: 'POST',
        email: managerEmail,
      }),
      { params: Promise.resolve({ proposalId: prop.id }) }
    );
    assert.equal(retryExec.status, 200);
    const retryJson = await retryExec.json();
    assert.equal(retryJson.execution.status, 'COMPLETED');
    assert.equal(retryJson.execution.resolved, true);

    const recoveredRefund = await prisma.refundTransaction.findUnique({ where: { id: failedRefundRow!.id } });
    assert.equal(recoveredRefund?.status, 'COMPLETED');

    const recoveredCase = await prisma.caseRecord.findUnique({ where: { id: c.id } });
    assert.equal(recoveredCase?.status, CaseStatus.RESOLVED);

    const recoveredProp = await prisma.resolutionProposal.findUnique({ where: { id: prop.id } });
    assert.equal(recoveredProp?.status, 'COMPLETED');
  });
});

