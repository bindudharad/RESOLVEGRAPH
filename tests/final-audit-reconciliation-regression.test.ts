/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as canonicalPOST } from '../src/app/api/transactions/canonical/route';
import { GET as auditChainedGET } from '../src/app/api/audit/chained/route';
import { POST as packagesPOST } from '../src/app/api/packages/route';
import { POST as unboxingSessionsPOST } from '../src/app/api/unboxing/sessions/route';
import { POST as compareDisputePOST } from '../src/app/api/purchases/[id]/compare-dispute/route';
import { GET as eventsGET } from '../src/app/api/cases/[caseId]/events/route';
import { BuyerTrackingService } from '../src/server/services/buyer-tracking.service';
import { prisma } from '../src/lib/prisma';

function mockNextRequest(url: string, init?: RequestInit, userEmail: string = 'admin@resolvegraph.demo'): NextRequest {
  const headers = new Headers(init?.headers || {});
  headers.set('x-demo-user-email', userEmail);
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...init,
    headers,
  } as any);
}

describe('Final Audit Reconciliation & Defect Regression Test Suite', () => {
  test('Defect 1: POST /api/transactions/canonical seeds multi-source transaction with provider and source observations', async () => {
    const caseRecord = await prisma.caseRecord.findFirst();
    assert.ok(caseRecord, 'CaseRecord must exist');

    const req = mockNextRequest('http://localhost:3000/api/transactions/canonical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: caseRecord.id,
        provider: 'PAYPAL',
        canonicalReference: `TX-REGRESSION-${Date.now().toString().slice(-6)}`,
        grossAmountMinor: 4999,
        feeAmountMinor: 175,
        currency: 'USD',
        normalizedStatus: 'COMPLETED',
        sourceRecords: [
          {
            sourceType: 'PAYMENT_GATEWAY',
            providerName: 'PayPal Sandbox',
            claimedReference: 'CAPTURE-REGRESSION-1',
            claimedAmountMinor: 4999,
            claimedCurrency: 'USD',
            claimedStatus: 'COMPLETED',
          },
          {
            sourceType: 'MERCHANT_INVOICE',
            providerName: 'TechStore Portal',
            claimedReference: 'ORD-REGRESSION-1',
            claimedAmountMinor: 4999,
            claimedCurrency: 'USD',
            claimedStatus: 'PENDING_CAPTURE',
          },
        ],
      }),
    });

    const res = await canonicalPOST(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data?.id);
    assert.equal(body.data.provider, 'PAYPAL');
  });

  test('Defect 2: GET /api/audit/chained?verify=true returns isChainValid matching verification.isValid', async () => {
    const req = mockNextRequest('http://localhost:3000/api/audit/chained?verify=true');
    const res = await auditChainedGET(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.verification?.isValid, 'boolean');
    assert.equal(body.isChainValid, body.verification.isValid);
    assert.equal(body.isChainValid, true);
  });

  test('Defect 4: GET /api/cases/[caseId]/events resolves legacy alias RG-2026-0412 and canonical RG-1001 identically', async () => {
    const req1001 = mockNextRequest('http://localhost:3000/api/cases/RG-1001/events?unified=true');
    const res1001 = await eventsGET(req1001, { params: Promise.resolve({ caseId: 'RG-1001' }) });
    assert.equal(res1001.status, 200);
    const events1001 = await res1001.json();
    assert.ok(Array.isArray(events1001) && events1001.length > 0);

    const reqAlias = mockNextRequest('http://localhost:3000/api/cases/RG-2026-0412/events?unified=true');
    const resAlias = await eventsGET(reqAlias, { params: Promise.resolve({ caseId: 'RG-2026-0412' }) });
    assert.equal(resAlias.status, 200);
    const eventsAlias = await resAlias.json();
    assert.ok(Array.isArray(eventsAlias) && eventsAlias.length > 0);
    assert.equal(events1001.length, eventsAlias.length);
  });

  test('Defect 5: POST /api/purchases/[id]/compare-dispute performs divergence detection without HTTP 400', async () => {
    const memory = await prisma.purchaseMemory.findFirst();
    assert.ok(memory, 'PurchaseMemory must exist in db');

    const req = mockNextRequest(
      `http://localhost:3000/api/purchases/${memory.id}/compare-dispute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimStatement: 'Customer received 512GB SSD model instead of 1TB NVMe.',
        }),
      },
      'alex.morgan@consumer.demo'
    );

    const res = await compareDisputePOST(req, { params: Promise.resolve({ id: memory.id }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(typeof body.divergenceDetected, 'boolean');
    assert.ok(body.baselineSummary);
  });

  test('Package Passport Creation accepts both title and productName', async () => {
    const req = mockNextRequest('http://localhost:3000/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carrierName: 'Delhivery Logistics',
        trackingNumber: `DEL-TEST-${Date.now().toString().slice(-6)}`,
        items: [
          {
            title: 'UltraPro 15-inch Laptop M2',
            sku: 'SKU-UP15-M2',
            quantity: 1,
            serialNumber: `SN-${Date.now().toString().slice(-8)}`,
          },
        ],
      }),
    });

    const res = await packagesPOST(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.package?.packageNumber.startsWith('PKG-'));
  });

  test('Dual-Sight Camera Session Initiation resolves caseNumber foreign key to cuid', async () => {
    const req = mockNextRequest(
      'http://localhost:3000/api/unboxing/sessions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: 'RG-1001',
          captureMode: 'DUAL_CONCURRENT',
          deviceInfo: 'CameraX Web Test',
          isFrontOptionalAccepted: true,
        }),
      },
      'alex.morgan@consumer.demo'
    );

    const res = await unboxingSessionsPOST(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.session?.sessionToken.startsWith('sess_'));
    assert.equal(typeof body.challenge?.challengeCode, 'string');
    assert.equal(body.challenge.challengeCode.length, 6);
  });

  test('Timeline status synchronization: Resolved case (RG-1465 / RG-1468) does not leave stage 2 or 3 as CURRENT', async () => {
    const mockUser: any = {
      id: 'usr_alex_buyer',
      email: 'alex.morgan@consumer.demo',
      role: 'BUYER',
      isPlatformAdmin: false,
      organizationMemberships: [],
    };
    const detail1465 = await BuyerTrackingService.getBuyerComplaintDetail(mockUser, 'RG-1465');
    assert.ok(detail1465, 'RG-1465 detail must exist');
    const stage2 = detail1465.timeline.find((s) => s.stageKey === 'RESOLVEGRAPH_ANALYSIS');
    const stage3 = detail1465.timeline.find((s) => s.stageKey === 'SELLER_EVIDENCE');
    assert.ok(stage2, 'Stage 2 must exist');
    assert.ok(stage3, 'Stage 3 must exist');
    assert.notEqual(stage2.status, 'CURRENT', 'Stage 2 must not be CURRENT on resolved case');
    assert.notEqual(stage3.status, 'CURRENT', 'Stage 3 must not be CURRENT on resolved case');
    assert.equal(stage2.status, 'COMPLETED');
    assert.equal(stage3.status, 'COMPLETED');
  });
});
