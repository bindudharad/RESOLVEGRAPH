/**
 * RESOLVEGRAPH 2.0 — End-to-End PayPal Hackathon Demonstration Test
 * 
 * Verifies the 13-stage end-to-end payment investigation workflow:
 * 1. Order Creation ($49.99)
 * 2. Payment Capture
 * 3. Webhook Ingestion & Signature Verification
 * 4. Case & Claim Registration
 * 5. Evidence Upload (Merchant cancellation notice)
 * 6. AI Agent Investigation & Tool Calling
 * 7. Canonical Transaction Engine & 10-Tier Matching
 * 8. Bilateral Evidence Graph (BEG) Construction
 * 9. BERR v2 Reasoning & Discrepancy Detection
 * 10. Financial Action Guardrail & SHA-256 Argument Hash
 * 11. Human Authorization Sign-Off
 * 12. Idempotent PayPal Refund Execution
 * 13. Cryptographic Tamper-Evident Audit Chaining & Final Report
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PayPalDemoService } from '../src/server/services/paypal-demo.service';
import { prisma } from '../src/lib/prisma';
import { FinancialActionGuardrails } from '../src/server/agents/guardrails/financial-action-guardrails';

describe('RESOLVEGRAPH 2.0: Master PayPal End-to-End Hackathon Demonstration', () => {
  it('executes full 13-stage PayPal investigation and authorized resolution scenario', async () => {
    const demo = await PayPalDemoService.executeFullDemonstration();

    assert.strictEqual(demo.success, true);
    assert.ok(demo.orderNumber.startsWith('ORD-'));
    assert.ok(demo.paypalOrderId);
    assert.ok(demo.paypalCaptureId);
    assert.ok(demo.caseNumber.startsWith('CASE-PAYPAL-'));
    assert.ok(demo.evidenceId);

    // Verify AI Investigation Output conforms to Section 6.4 format
    assert.ok(demo.investigationResult);
    assert.strictEqual(demo.investigationResult.case_id, demo.caseId);
    assert.ok(demo.investigationResult.confirmed_facts.length >= 1);
    assert.ok(demo.investigationResult.user_submitted_information.length >= 1);
    assert.ok(demo.investigationResult.provider_verified_information.length >= 1);
    assert.strictEqual(demo.investigationResult.requires_human_review, true);
    assert.ok(demo.investigationResult.confidence.overall >= 0.9);

    // Verify Financial Safeguards & Argument Hash
    assert.strictEqual(demo.approvalStatus, 'APPROVED');
    assert.ok(demo.argumentsHash);
    assert.strictEqual(demo.argumentsHash.length, 64, 'SHA-256 hash must be 64 hex characters');

    // Verify Refund Execution
    assert.ok(demo.refundId);
    const refundDb = await prisma.refundTransaction.findFirst({
      where: { paypalRefundId: demo.refundId },
    });
    assert.ok(refundDb);
    assert.strictEqual(refundDb.status, 'COMPLETED');
    assert.strictEqual(refundDb.amountMinor, 4999);

    // Verify Canonical Transaction is updated to REFUNDED
    const canonicalTx = await prisma.canonicalTransaction.findFirst({
      where: { caseId: demo.caseId, normalizedStatus: 'REFUNDED' },
    });
    assert.ok(canonicalTx);
    assert.strictEqual(canonicalTx.grossAmountMinor, 4999);

    // Verify Tamper-Evident Chained Audit Record
    assert.ok(demo.auditRecordHash);
    const auditRecord = await prisma.hashChainedAuditRecord.findFirst({
      where: { action: 'PAYPAL_REFUND_EXECUTED', resourceId: demo.caseId },
    });
    assert.ok(auditRecord);
    assert.strictEqual(auditRecord.currentHash, demo.auditRecordHash);

    // Verify Timeline stages
    assert.ok(demo.timeline.length >= 10);
    assert.ok(demo.timeline.some((t) => t.stage === 'ORDER_CREATED'));
    assert.ok(demo.timeline.some((t) => t.stage === 'PAYMENT_CAPTURED'));
    assert.ok(demo.timeline.some((t) => t.stage === 'AGENT_INVESTIGATION'));
    assert.ok(demo.timeline.some((t) => t.stage === 'HUMAN_APPROVAL_SIGNED'));
    assert.ok(demo.timeline.some((t) => t.stage === 'REFUND_EXECUTED'));
    assert.ok(demo.timeline.some((t) => t.stage === 'AUDIT_CHAINED_AND_RESOLVED'));
  });

  it('guarantees that tampered approval arguments are strictly rejected by safeguards', async () => {
    const originalArgs = {
      caseId: 'test_case',
      amountMinor: 4999,
      currency: 'USD',
      captureId: 'CAP-TEST-123',
    };
    const validHash = FinancialActionGuardrails.computeArgumentsHash(originalArgs);

    const tamperedArgs = {
      ...originalArgs,
      amountMinor: 9999, // tampered from $49.99 to $99.99
    };

    const isValid = FinancialActionGuardrails.verifyArgumentsHash(tamperedArgs, validHash);
    assert.strictEqual(isValid, false, 'Tampered amount must fail hash verification.');
  });
});
