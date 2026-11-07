import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ContradictionDetector } from '../src/server/ai/reasoning/contradiction-detector';
import { MissingEvidenceDetector } from '../src/server/ai/reasoning/missing-evidence-detector';
import { BerrEngine } from '../src/server/ai/reasoning/berr-engine';
import { AnalysisQueue } from '../src/server/ai/jobs/analysis-queue';
import { ConsentManager } from '../src/server/ai/security/consent-manager';
import { prisma } from '../src/lib/prisma';

describe('ResolveGraph BERR Reasoning Engine Suite', () => {
  test('ContradictionDetector calculates weighted discrepancy D = alpha*D_exact + beta*D_semantic + gamma*D_temporal', () => {
    const result = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: ['I received a 512GB laptop, but I paid for 1TB'],
      merchantStatements: ['Order details confirm 1TB model shipped'],
      evidenceFacts: []
    });

    const d = result.discrepancy;
    assert.ok(d.totalDiscrepancyScore >= 0.5, 'Expected discrepancy >= 0.5 for 512GB vs 1TB mismatch');
    const expected = Number((d.weights.alpha * d.exactDiscrepancy + d.weights.beta * d.semanticDiscrepancy + d.weights.gamma * d.temporalDiscrepancy).toFixed(3));
    assert.strictEqual(d.totalDiscrepancyScore, expected);
    assert.ok(result.comparisons.some((c) => c.discrepancyType === 'SPECIFICATION'));
  });

  test('MissingEvidenceDetector flags missing carrier tracking for NON_DELIVERY disputes', () => {
    const missing = MissingEvidenceDetector.detectMissingEvidence({
      category: 'NON_DELIVERY',
      existingEvidenceTypes: ['RECEIPT'],
      hasCarrierTracking: false,
      hasSignatureProof: false,
      hasPackagingPhotos: false,
      hasReturnLabel: false
    });

    assert.ok(missing.some((m) => m.evidenceType === 'CARRIER_TRACKING_REPORT' && m.party === 'MERCHANT'));
  });

  test('MissingEvidenceDetector flags missing invoice and serial photo for NOT_AS_DESCRIBED', () => {
    const missing = MissingEvidenceDetector.detectMissingEvidence({
      category: 'NOT_AS_DESCRIBED',
      existingEvidenceTypes: [],
      hasCarrierTracking: true,
      hasSignatureProof: true,
      hasPackagingPhotos: false,
      hasReturnLabel: false
    });

    assert.ok(missing.some((m) => m.evidenceType === 'ITEMIZED_MERCHANT_INVOICE'));
    assert.ok(missing.some((m) => m.evidenceType === 'PRODUCT_SERIAL_PHOTO'));
  });

  test('BerrEngine runs full 8-stage pipeline with consent and produces structured findings', async () => {
    const caseRecord = await prisma.caseRecord.findFirst({
      include: { evidence: true, claims: true }
    });
    assert.ok(caseRecord);

    const user = await prisma.user.findFirst();
    assert.ok(user);

    // Grant consent to evidence & claims for this test
    for (const ev of caseRecord.evidence) {
      await ConsentManager.grantConsent({
        targetType: 'EVIDENCE',
        targetId: ev.id,
        grantedById: user.id,
        caseId: caseRecord.id,
        provider: 'test'
      });
    }
    for (const cl of caseRecord.claims) {
      await ConsentManager.grantConsent({
        targetType: 'CLAIM',
        targetId: cl.id,
        grantedById: user.id,
        caseId: caseRecord.id,
        provider: 'test'
      });
    }

    // Enqueue run
    const run = await AnalysisQueue.enqueueAnalysis({
      caseId: caseRecord.id,
      requestedById: user.id,
      provider: 'test'
    });

    assert.strictEqual(run.status, 'QUEUED');

    // Execute through BERR engine
    const result = await BerrEngine.runCaseBERR(run.id, true);

    assert.ok(['COMPLETED', 'NEEDS_HUMAN_REVIEW'].includes(result.status));
    assert.ok(result.findingsCount >= 1);

    // Check saved database records
    const fullRun = await AnalysisQueue.getRunDetails(run.id);
    assert.ok(fullRun);
    assert.ok(fullRun.findings.length >= 1);
    assert.ok(fullRun.inputs.length >= 1);

    // Safety checks: BERR MUST NOT alter case status or issue refunds
    const caseAfter = await prisma.caseRecord.findUnique({ where: { id: caseRecord.id } });
    assert.strictEqual(caseAfter?.status, caseRecord.status, 'Case status must NOT be modified by AI analysis');
  });
});
