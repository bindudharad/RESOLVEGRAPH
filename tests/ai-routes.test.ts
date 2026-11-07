/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as analysisPOST, GET as analysisGET } from '../src/app/api/cases/[caseId]/analysis/route';
import { GET as runGET } from '../src/app/api/analysis/[runId]/route';
import { POST as reviewPOST } from '../src/app/api/analysis/[runId]/review/route';
import { POST as consentEvidencePOST, DELETE as consentEvidenceDELETE } from '../src/app/api/evidence/[evidenceId]/ai-consent/route';
import { POST as consentClaimPOST, DELETE as consentClaimDELETE } from '../src/app/api/claims/[claimId]/ai-consent/route';
import { prisma } from '../src/lib/prisma';
import { AnalysisQueue } from '../src/server/ai/jobs/analysis-queue';

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

describe('ResolveGraph AI API Route Handlers Suite', () => {
  test('POST /api/cases/[caseId]/analysis enqueues analysis run', async () => {
    const caseRecord = await prisma.caseRecord.findFirst();
    assert.ok(caseRecord);

    const req = mockNextRequest(`http://localhost:3000/api/cases/${caseRecord.id}/analysis`, {
      method: 'POST',
      body: JSON.stringify({ provider: 'test', analysisType: 'FULL_BERR' })
    });

    const res = await analysisPOST(req, { params: Promise.resolve({ caseId: caseRecord.id }) });
    assert.strictEqual(res.status, 202);

    const body = await res.json();
    assert.ok(body.runId);
    assert.strictEqual(body.status, 'QUEUED');
  });

  test('GET /api/cases/[caseId]/analysis lists runs for the case', async () => {
    const caseRecord = await prisma.caseRecord.findFirst();
    assert.ok(caseRecord);

    const req = mockNextRequest(`http://localhost:3000/api/cases/${caseRecord.id}/analysis`);
    const res = await analysisGET(req, { params: Promise.resolve({ caseId: caseRecord.id }) });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.caseId, caseRecord.id);
    assert.ok(Array.isArray(body.runs));
  });

  test('GET /api/analysis/[runId] returns full run details', async () => {
    const caseRecord = await prisma.caseRecord.findFirst();
    assert.ok(caseRecord);
    const admin = await prisma.user.findFirst();
    assert.ok(admin);

    const run = await AnalysisQueue.enqueueAnalysis({
      caseId: caseRecord.id,
      requestedById: admin.id,
      provider: 'test'
    });

    const req = mockNextRequest(`http://localhost:3000/api/analysis/${run.id}`);
    const res = await runGET(req, { params: Promise.resolve({ runId: run.id }) });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, run.id);
    assert.strictEqual(body.caseId, caseRecord.id);
  });

  test('POST /api/analysis/[runId]/review records human feedback', async () => {
    const caseRecord = await prisma.caseRecord.findFirst();
    assert.ok(caseRecord);
    const admin = await prisma.user.findFirst();
    assert.ok(admin);

    const run = await AnalysisQueue.enqueueAnalysis({
      caseId: caseRecord.id,
      requestedById: admin.id,
      provider: 'test'
    });

    // Create a finding to review
    const finding = await prisma.berrFinding.create({
      data: {
        caseId: caseRecord.id,
        analysisRunId: run.id,
        findingType: 'CONTRADICTION',
        outcome: 'CONFLICTING',
        severity: 'HIGH',
        title: 'Spec discrepancy',
        explanation: '512GB vs 1TB mismatch',
        recommendedNextStep: 'Request warehouse scan'
      }
    });

    const req = mockNextRequest(`http://localhost:3000/api/analysis/${run.id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        findingId: finding.id,
        action: 'CONFIRMED',
        userNotes: 'Discrepancy verified against packing slip'
      })
    });

    const res = await reviewPOST(req, { params: Promise.resolve({ runId: run.id }) });
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.finding.reviewStatus, 'CONFIRMED');
  });

  test('Consent APIs grant and revoke AI consent for evidence and claims', async () => {
    const ev = await prisma.evidence.findFirst();
    assert.ok(ev);

    // Grant evidence consent
    const grantReq = mockNextRequest(`http://localhost:3000/api/evidence/${ev.id}/ai-consent`, {
      method: 'POST',
      body: JSON.stringify({ provider: 'openai', purpose: 'MULTIMODAL_EXTRACTION' })
    });
    const grantRes = await consentEvidencePOST(grantReq, { params: Promise.resolve({ evidenceId: ev.id }) });
    assert.strictEqual(grantRes.status, 200);
    const grantBody = await grantRes.json();
    assert.strictEqual(grantBody.success, true);

    // Revoke evidence consent
    const revokeReq = mockNextRequest(`http://localhost:3000/api/evidence/${ev.id}/ai-consent`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'Revocation test' })
    });
    const revokeRes = await consentEvidenceDELETE(revokeReq, { params: Promise.resolve({ evidenceId: ev.id }) });
    assert.strictEqual(revokeRes.status, 200);
    const revokeBody = await revokeRes.json();
    assert.strictEqual(revokeBody.success, true);
    assert.ok(revokeBody.revokedCount >= 1);

    // Grant & Revoke claim consent
    const claim = await prisma.claim.findFirst();
    assert.ok(claim);
    const grantClaimReq = mockNextRequest(`http://localhost:3000/api/claims/${claim.id}/ai-consent`, {
      method: 'POST',
      body: JSON.stringify({ provider: 'openai', purpose: 'BERR_REASONING' })
    });
    const grantClaimRes = await consentClaimPOST(grantClaimReq, { params: Promise.resolve({ claimId: claim.id }) });
    assert.strictEqual(grantClaimRes.status, 200);

    const revokeClaimReq = mockNextRequest(`http://localhost:3000/api/claims/${claim.id}/ai-consent`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'Claim revocation test' })
    });
    const revokeClaimRes = await consentClaimDELETE(revokeClaimReq, { params: Promise.resolve({ claimId: claim.id }) });
    assert.strictEqual(revokeClaimRes.status, 200);
  });
});
