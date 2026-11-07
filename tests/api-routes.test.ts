/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GET as healthGET } from '../src/app/api/health/route';
import { GET as casesGET, POST as casesPOST } from '../src/app/api/cases/route';
import { GET as caseDetailGET, PATCH as caseDetailPATCH } from '../src/app/api/cases/[caseId]/route';
import { GET as claimsGET, POST as claimsPOST } from '../src/app/api/cases/[caseId]/claims/route';
import { GET as evidenceGET, POST as evidencePOST } from '../src/app/api/cases/[caseId]/evidence/route';
import { GET as eventsGET } from '../src/app/api/cases/[caseId]/events/route';
import { GET as usersGET } from '../src/app/api/users/route';
import { GET as dashboardSummaryGET } from '../src/app/api/dashboard/summary/route';
import { GET as workspaceEvidenceGET } from '../src/app/api/evidence/route';
import { NextRequest } from 'next/server';

function mockNextRequest(url: string, init?: RequestInit): NextRequest {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('x-demo-user-email')) {
    headers.set('x-demo-user-email', 'admin@resolvegraph.demo');
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    ...init,
    headers,
  } as any);
}

describe('ResolveGraph Next.js Route Handlers Test Suite', () => {
  test('GET /api/health returns healthy database status', async () => {
    const res = await healthGET();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.equal(body.database.connected, true);
    assert.equal(body.database.adapter, '@prisma/adapter-better-sqlite3');
    assert.ok(body.database.stats.cases >= 10);
  });

  test('GET /api/cases returns paginated cases and filters', async () => {
    const req = mockNextRequest('http://localhost:3000/api/cases?limit=5&page=1');
    const res = await casesGET(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.items.length, 5);
    assert.equal(body.pagination.page, 1);
    assert.equal(body.pagination.limit, 5);
    assert.ok(body.pagination.total >= 10);
  });

  test('POST /api/cases creates case and validates Zod schema', async () => {
    // 1. Invalid payload should return 400
    const invalidReq = mockNextRequest('http://localhost:3000/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hi' }), // too short
    });
    const invalidRes = await casesPOST(invalidReq);
    assert.equal(invalidRes.status, 400);

    // 2. Valid payload
    const validReq = mockNextRequest('http://localhost:3000/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Route Handler Test Case',
        description: 'Verifying POST /api/cases route handler with SQLite transaction.',
        category: 'DAMAGED_GOODS',
        priority: 'MEDIUM',
        amountMinor: 8900,
        currency: 'USD',
        buyerId: 'usr_sarah_buyer',
        merchantId: 'usr_techstore_merchant',
      }),
    });
    const validRes = await casesPOST(validReq);
    assert.equal(validRes.status, 201);
    const created = await validRes.json();
    assert.ok(created.caseNumber.startsWith('RG-'));
    assert.equal(created.amountMinor, 8900);
  });

  test('GET and PATCH /api/cases/[caseId]', async () => {
    const getReq = mockNextRequest('http://localhost:3000/api/cases/RG-1001');
    const getRes = await caseDetailGET(getReq, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(getRes.status, 200);
    const caseData = await getRes.json();
    assert.equal(caseData.caseNumber, 'RG-1001');

    // 404 for unknown case
    const unknownReq = mockNextRequest('http://localhost:3000/api/cases/RG-999999');
    const unknownRes = await caseDetailGET(unknownReq, {
      params: Promise.resolve({ caseId: 'RG-999999' }),
    });
    assert.equal(unknownRes.status, 404);

    // PATCH with valid note
    const patchReq = mockNextRequest('http://localhost:3000/api/cases/RG-1001', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note: 'Audit note added via API route handler test',
        actorId: 'usr_priya_admin',
      }),
    });
    const patchRes = await caseDetailPATCH(patchReq, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(patchRes.status, 200);
  });

  test('GET and POST /api/cases/[caseId]/claims', async () => {
    const listReq = mockNextRequest('http://localhost:3000/api/cases/RG-1001/claims');
    const listRes = await claimsGET(listReq, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(listRes.status, 200);
    const claims = await listRes.json();
    assert.ok(claims.length >= 2);

    const postReq = mockNextRequest('http://localhost:3000/api/cases/RG-1001/claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authorId: 'usr_alex_buyer',
        partyRole: 'BUYER',
        claimType: 'OTHER',
        statement: 'Submitting additional statement regarding original packaging seal.',
      }),
    });
    const postRes = await claimsPOST(postReq, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(postRes.status, 201);
  });

  test('GET and POST /api/cases/[caseId]/evidence', async () => {
    const listReq = mockNextRequest('http://localhost:3000/api/cases/RG-1001/evidence');
    const listRes = await evidenceGET(listReq, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(listRes.status, 200);
    const evidenceList = await listRes.json();
    assert.ok(evidenceList.length >= 3);

    const postReq = mockNextRequest('http://localhost:3000/api/cases/RG-1001/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploadedById: 'usr_alex_buyer',
        filename: 'serial-closeup-photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 890000,
        storageKey: 'evidence/rg-1001/serial-closeup.jpg',
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        evidenceType: 'PHOTO',
        sourceType: 'BUYER_UPLOAD',
        verificationStatus: 'VERIFIED',
      }),
    });
    const postRes = await evidencePOST(postReq, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(postRes.status, 201);
  });

  test('GET /api/cases/[caseId]/events returns chronological audit events', async () => {
    const req = mockNextRequest('http://localhost:3000/api/cases/RG-1001/events');
    const res = await eventsGET(req, {
      params: Promise.resolve({ caseId: 'RG-1001' }),
    });
    assert.equal(res.status, 200);
    const events = await res.json();
    assert.ok(events.length >= 3);
  });

  test('GET /api/users returns registered demo users', async () => {
    const req = mockNextRequest('http://localhost:3000/api/users');
    const res = await usersGET(req);
    assert.equal(res.status, 200);
    const users = await res.json();
    assert.ok(users.length >= 4);
    assert.ok(users.some((u: any) => u.email === 'admin@resolvegraph.demo'));
  });

  test('GET /api/dashboard/summary returns DB aggregations', async () => {
    const req = mockNextRequest('http://localhost:3000/api/dashboard/summary');
    const res = await dashboardSummaryGET(req);
    assert.equal(res.status, 200);
    const summary = await res.json();
    assert.ok(summary.kpis.totalCases.value >= 10);
    assert.ok(summary.recentCases.length >= 1);
  });

  test('GET /api/evidence returns workspace-wide evidence items', async () => {
    const req = mockNextRequest('http://localhost:3000/api/evidence?limit=10');
    const res = await workspaceEvidenceGET(req);
    assert.equal(res.status, 200);
    const list = await res.json();
    assert.ok(list.items.length >= 1);
    assert.ok(list.pagination.total >= 1);
  });
});
