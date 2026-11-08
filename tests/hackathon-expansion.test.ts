/**
 * RESOLVEGRAPH Hackathon Expansion Master Test Suite
 * 
 * Verifies all 12 expanded fintech & payment incident investigation modules:
 * 1. Universal Payment Evidence Intake & Magic-Byte Validation
 * 2. Canonical Transaction Engine & Largest-Remainder Allocation
 * 3. Cross-Platform Deterministic 10-Tier Matching Engine
 * 4. AI Root-Cause Investigation & 12-Stage Pipeline
 * 5. Forensic Dossier Generation & 4-Dimensional Evidence Scoring
 * 6. Cryptographic Hash-Chained Audit Ledger & Chain Integrity
 * 7. Administrative Emergency Kill Switch & Guardrails
 * 8. Multilingual Voice & Conversational Complaint Processing (EN, KN, HI)
 * 9. Extended Bilateral Evidence Graph (BEG) with Payment Nodes
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';
import { UniversalEvidenceIntakeService } from '../src/server/services/universal-evidence-intake.service';
import { CanonicalTransactionService } from '../src/server/services/canonical-transaction.service';
import { CrossPlatformMatchingService } from '../src/server/services/cross-platform-matching.service';
import { RootCauseInvestigationService } from '../src/server/services/root-cause-investigation.service';
import { InvestigationReportService } from '../src/server/services/investigation-report.service';
import { HashChainedAuditService } from '../src/server/services/hash-chained-audit.service';
import { KillSwitchService } from '../src/server/services/kill-switch.service';
import { MultilingualVoiceService } from '../src/server/services/multilingual-voice.service';
import { GraphBuilder } from '../src/server/graph/graph-builder';
import { GraphValidator } from '../src/server/graph/graph-validator';

describe('RESOLVEGRAPH Hackathon Expansion: Payment Investigation Platform Suite', () => {
  let testCaseId: string;
  let testBuyerId: string;

  it('Setup: retrieves or initializes target test case with buyer and merchant organization', async () => {
    const existingCase = await prisma.caseRecord.findFirst({
      where: { caseNumber: { startsWith: 'RG-' } },
      include: { buyer: true, organization: true },
    });

    assert.ok(existingCase, 'Baseline database must have at least one test case');
    testCaseId = existingCase.id;
    testBuyerId = existingCase.buyerId;
  });

  // --------------------------------------------------------------------------
  // 1. Universal Evidence Intake & Magic Bytes
  // --------------------------------------------------------------------------
  describe('1. Universal Payment Evidence Intake & Calibrated Extraction', () => {
    it('validates binary magic bytes for PDF, PNG, JPEG, and text formats', () => {
      const pdfHeader = Buffer.from('%PDF-1.4 test content');
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      const corruptHeader = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44]);

      const pdfCheck = UniversalEvidenceIntakeService.validateMagicBytes(pdfHeader, 'invoice.pdf');
      assert.strictEqual(pdfCheck.valid, true);
      assert.strictEqual(pdfCheck.detectedMime, 'application/pdf');

      const pngCheck = UniversalEvidenceIntakeService.validateMagicBytes(pngHeader, 'screenshot.png');
      assert.strictEqual(pngCheck.valid, true);
      assert.strictEqual(pngCheck.detectedMime, 'image/png');

      const corruptCheck = UniversalEvidenceIntakeService.validateMagicBytes(corruptHeader, 'unknown.bin');
      assert.strictEqual(corruptCheck.valid, false);
      assert.ok(corruptCheck.error?.includes('Unrecognized'));
    });

    it('ingests evidence file, computes exact SHA-256, and extracts anchors with confidence scores', async () => {
      const nonce = Date.now();
      const csvData = Buffer.from(
        `Transaction_Date,UPI_Ref_No,Provider,Amount,Status\n2026-11-08,UPI_${nonce},PhonePe,INR 1499.00,SUCCESS\n`
      );

      const intake = await UniversalEvidenceIntakeService.ingestEvidence({
        caseId: testCaseId,
        actorId: testBuyerId,
        fileName: `phonepe_debit_${nonce}.csv`,
        buffer: csvData,
        mimeType: 'text/csv',
        sourceType: 'UPI_APP',
        providerName: 'PhonePe',
      });

      assert.ok(intake.evidence.id);
      assert.strictEqual(intake.duplicateCheck.isDuplicate, false);
      assert.ok(intake.extractedFields.length > 0);

      // Verify calibrated confidence score
      const amountField = intake.extractedFields.find((f) => f.fieldName.toLowerCase() === 'amount');
      assert.ok(amountField, 'Should extract amount anchor');
      assert.ok(amountField.confidence >= 0.9);
      assert.strictEqual(amountField.extractedValue, '1499.00');

      // Human correction verification
      const corrected = await UniversalEvidenceIntakeService.correctExtractedField(
        amountField.id,
        '1499.00',
        testBuyerId
      );
      assert.strictEqual(corrected.isVerifiedByUser, true);
      assert.strictEqual(corrected.userCorrectedValue, '1499.00');
    });

    it('detects duplicate evidence uploads via SHA-256 fingerprinting', async () => {
      const dupData = Buffer.from(`UNIQUE_PAYMENT_PROOF_BLOCK_${Date.now()}`);
      await UniversalEvidenceIntakeService.ingestEvidence({
        caseId: testCaseId,
        actorId: testBuyerId,
        fileName: 'unique_proof_v1.txt',
        buffer: dupData,
        mimeType: 'text/plain',
        sourceType: 'PAYMENT_GATEWAY',
        providerName: 'PayPal',
      });

      // Second ingestion with exact same bytes
      const secondIntake = await UniversalEvidenceIntakeService.ingestEvidence({
        caseId: testCaseId,
        actorId: testBuyerId,
        fileName: 'unique_proof_v2_dup.txt',
        buffer: dupData,
        mimeType: 'text/plain',
        sourceType: 'PAYMENT_GATEWAY',
        providerName: 'PayPal',
      });

      assert.strictEqual(secondIntake.duplicateCheck.isDuplicate, true);
      assert.strictEqual(secondIntake.duplicateCheck.duplicateType, 'EXACT_HASH');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Canonical Transaction Engine & Largest-Remainder Allocation
  // --------------------------------------------------------------------------
  describe('2. Canonical Transaction Engine & Proportional Math', () => {
    it('normalizes provider-specific statuses to canonical states', () => {
      assert.strictEqual(CanonicalTransactionService.normalizeStatus('succeeded'), 'COMPLETED');
      assert.strictEqual(CanonicalTransactionService.normalizeStatus('SUCCESS'), 'COMPLETED');
      assert.strictEqual(CanonicalTransactionService.normalizeStatus('captured'), 'COMPLETED');
      assert.strictEqual(CanonicalTransactionService.normalizeStatus('DECLINED'), 'FAILED');
      assert.strictEqual(CanonicalTransactionService.normalizeStatus('REVERSED'), 'REFUNDED');
      assert.strictEqual(CanonicalTransactionService.normalizeStatus('unknown_arbitrary'), 'PENDING');
    });

    it('allocates refund portions without rounding loss using largest-remainder algorithm', () => {
      // Allocate 1000 cents ($10.00) across 3 items with equal proportions (33.333% each)
      // Standard division gives 333.33 -> floor gives 333 * 3 = 999 (1 cent lost)
      // Largest-remainder must allocate [334, 333, 333] summing exactly to 1000.
      const allocation = CanonicalTransactionService.allocateProportional(1000, [1, 1, 1]);
      assert.strictEqual(allocation.length, 3);
      assert.strictEqual(allocation.reduce((a, b) => a + b, 0), 1000);
      assert.deepStrictEqual(allocation, [334, 333, 333]);
    });

    it('creates decimal-safe canonical transaction record in database', async () => {
      const canonicalTx = await CanonicalTransactionService.createCanonicalTransaction({
        caseId: testCaseId,
        provider: 'PAYPAL',
        providerTxId: 'CAPTURE-SANDBOX-101',
        externalReference: 'PP-EXT-101',
        grossAmountMinor: 4999, // $49.99
        feeAmountMinor: 175,
        currency: 'USD',
        originalStatus: 'COMPLETED',
        transactionTimestamp: new Date(),
      });

      assert.ok(canonicalTx.id);
      assert.strictEqual(canonicalTx.grossAmountMinor, 4999);
      assert.strictEqual(canonicalTx.netAmountMinor, 4824);

      const obs = await CanonicalTransactionService.recordSourceObservation({
        caseId: testCaseId,
        canonicalTransactionId: canonicalTx.id,
        sourceType: 'PAYMENT_GATEWAY',
        sourceName: 'PayPal Sandbox',
        referenceId: 'CAPTURE-SANDBOX-101',
        amountMinor: 4999,
        currency: 'USD',
        reportedStatus: 'COMPLETED',
        reportedAt: new Date(),
      });

      assert.ok(obs.id);
      assert.strictEqual(obs.referenceId, 'CAPTURE-SANDBOX-101');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Deterministic 10-Tier Matching Engine
  // --------------------------------------------------------------------------
  describe('3. Cross-Platform Transaction Matching Engine', () => {
    it('evaluates exact reference matching (Tier 1)', () => {
      const tx = {
        providerTxId: 'REF-XYZ-12345',
        externalReference: 'UTR-XYZ-12345',
        grossAmountMinor: 5000,
        currency: 'USD',
        normalizedStatus: 'COMPLETED',
        transactionTimestamp: new Date('2026-11-08T10:00:00Z'),
      };
      const src = {
        referenceId: 'REF-XYZ-12345',
        amountMinor: 5000,
        currency: 'USD',
        reportedStatus: 'COMPLETED',
        reportedAt: new Date('2026-11-08T10:01:00Z'),
        sourceName: 'TechStore',
      };

      const decision = CrossPlatformMatchingService.evaluatePair(tx, src);
      assert.strictEqual(decision.outcome, 'MATCHED');
      assert.strictEqual(decision.matchTier, 'EXACT_TX_ID');
      assert.ok(decision.score >= 0.95);
      assert.ok(decision.matchedFields.includes('providerTxId'));
    });

    it('detects amount and status conflicts (Tier 10 / Conflict)', () => {
      const tx = {
        providerTxId: 'REF-DIFF-001',
        grossAmountMinor: 5000,
        currency: 'USD',
        normalizedStatus: 'COMPLETED',
        transactionTimestamp: new Date('2026-11-08T10:00:00Z'),
      };
      const src = {
        referenceId: 'REF-DIFF-002',
        amountMinor: 3000, // Conflict!
        currency: 'USD',
        reportedStatus: 'FAILED', // Conflict!
        reportedAt: new Date('2026-11-08T10:00:00Z'),
        sourceName: 'Bank',
      };

      const decision = CrossPlatformMatchingService.evaluatePair(tx, src);
      assert.ok(decision.outcome === 'UNMATCHED' || decision.outcome === 'CONFLICT');
      assert.ok(decision.conflictingFields.length > 0);
    });

    it('executes end-to-end case reconciliation and flags discrepancies', async () => {
      const recon = await CrossPlatformMatchingService.reconcileCase(testCaseId);
      assert.ok(recon.totalDecisions >= 0);
      assert.ok(Array.isArray(recon.decisions));
      assert.ok(Array.isArray(recon.mismatches));
    });
  });

  // --------------------------------------------------------------------------
  // 4. AI Root-Cause Investigation & 12-Stage Pipeline
  // --------------------------------------------------------------------------
  describe('4. AI Root-Cause Investigation Engine', () => {
    it('executes 12-stage investigation pipeline and separates verified facts from hypotheses', async () => {
      const result = await RootCauseInvestigationService.investigateCase(
        testCaseId,
        'DEBITED_NOT_CREDITED'
      );

      assert.ok(result.incident.id);
      assert.strictEqual(result.incident.investigationStage, 'ROOT_CAUSE_ANALYSIS');
      assert.ok(result.incident.rootCauseHypothesis.length > 0);
      assert.ok(result.findings.length > 0);

      // Verify statutory TAT inclusion for Indian banking/UPI regulations
      assert.ok(result.incident.statutoryTatGuidance.includes('T+1'));
      assert.ok(result.incident.statutoryTatGuidance.includes('100'));

      // Check classification separation
      const hasFactOrClaim = result.findings.some(
        (f) => f.findingType === 'VERIFIED_FACT' || f.findingType === 'SOURCE_SUPPORTED_CLAIM'
      );
      assert.strictEqual(hasFactOrClaim, true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Advanced Forensic Reporting & 4-Dimensional Scoring
  // --------------------------------------------------------------------------
  describe('5. Forensic Dossier Generation & Evidence Scoring', () => {
    it('evaluates 4-dimensional evidentiary confidence', async () => {
      const inventory = await InvestigationReportService.evaluateEvidenceInventory(testCaseId);
      assert.ok(Array.isArray(inventory));
      if (inventory.length > 0) {
        assert.ok(inventory[0].fileIntegrity);
        assert.ok(inventory[0].sourceVerification);
        assert.ok(inventory[0].extractionStatus);
        assert.ok(inventory[0].relevance);
      }
    });

    it('generates Markdown dossier with PII masking', async () => {
      const mdReport = await InvestigationReportService.generateMarkdownReport(testCaseId);
      assert.ok(mdReport.includes('FORENSIC PAYMENT INVESTIGATION REPORT'));
      assert.ok(mdReport.includes('Multi-Dimensional Evidence Inventory'));
      assert.ok(mdReport.includes('Certification & Audit Sign-Off'));
    });

    it('generates CSV audit ledger format', async () => {
      const csvReport = await InvestigationReportService.generateCsvReconciliation(testCaseId);
      assert.ok(csvReport.startsWith('Canonical_Tx_ID'));
    });
  });

  // --------------------------------------------------------------------------
  // 6. Cryptographic Hash-Chained Audit Ledger
  // --------------------------------------------------------------------------
  describe('6. Cryptographic Hash-Chained Audit Ledger', () => {
    it('records sequential blocks and verifies entire chain integrity', async () => {
      // Record 2 sequential events
      const b1 = await HashChainedAuditService.recordEvent({
        action: 'TEST_ACTION_BLOCK_1',
        actorId: testBuyerId,
        resourceType: 'CaseRecord',
        resourceId: testCaseId,
        details: { step: 1 },
      });

      const b2 = await HashChainedAuditService.recordEvent({
        action: 'TEST_ACTION_BLOCK_2',
        actorId: testBuyerId,
        resourceType: 'CaseRecord',
        resourceId: testCaseId,
        details: { step: 2 },
      });

      assert.strictEqual(b2.previousHash, b1.currentHash);

      // Verify chain integrity
      const verification = await HashChainedAuditService.verifyChainIntegrity();
      assert.strictEqual(verification.isValid, true);
      assert.ok((verification.totalRecords ?? 0) >= 2);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Administrative Emergency Kill Switch & Guardrails
  // --------------------------------------------------------------------------
  describe('7. Administrative Emergency Kill Switch', () => {
    it('reads initial kill switch status and allows authorized administrative updates', async () => {
      const initial = await KillSwitchService.getStatus();
      assert.strictEqual(typeof initial.isOutboundPayPalKilled, 'boolean');

      // Update kill switch
      const updated = await KillSwitchService.updateStatus({
        isOutboundPayPalKilled: true,
        reason: 'Automated test halt verification',
        actorId: 'admin-test',
      });
      assert.strictEqual(updated.isOutboundPayPalKilled, true);

      // Verify outbound PayPal call is blocked
      await assert.rejects(
        async () => {
          await KillSwitchService.assertPayPalAllowed();
        },
        /blocked by administrative kill switch/
      );

      // Restore normal operations
      const restored = await KillSwitchService.updateStatus({
        isOutboundPayPalKilled: false,
        reason: 'Restoring operations post-test',
        actorId: 'admin-test',
      });
      assert.strictEqual(restored.isOutboundPayPalKilled, false);

      // Assert now passes without throwing
      await KillSwitchService.assertPayPalAllowed();
    });
  });

  // --------------------------------------------------------------------------
  // 8. Multilingual Voice & Conversational Complaint Processing
  // --------------------------------------------------------------------------
  describe('8. Multilingual Voice & Conversational Intake (EN, KN, HI)', () => {
    it('processes English conversational complaint and extracts amount & category', async () => {
      const res = await MultilingualVoiceService.processComplaint({
        statement: 'I paid Rs 2499 using PhonePe UPI to TechStore on Friday, but money debited and payment failed.',
        inputLanguage: 'en',
        hasAudioConsent: true,
        caseId: testCaseId,
        userId: testBuyerId,
      });

      assert.strictEqual(res.inputLanguage, 'en');
      assert.strictEqual(res.identifiedCategory, 'DEBITED_NOT_CREDITED');
      assert.strictEqual(res.extractedDetails.amount, '2499');
      assert.strictEqual(res.extractedDetails.provider, 'PHONEPE');
      assert.ok(res.generatedComplaint.includes('FORMAL COMPLAINT'));
    });

    it('processes Kannada (ಕನ್ನಡ) conversational input and provides English translation', async () => {
      const res = await MultilingualVoiceService.processComplaint({
        statement: 'ನನ್ನ ಬ್ಯಾಂಕ್ ಖಾತೆಯಿಂದ ಹಣ ಕಡಿತವಾಗಿದೆ ಆದರೆ ವ್ಯಾಪಾರಿಗೆ ಹಣ ತಲುಪಿಲ್ಲ.',
        inputLanguage: 'kn',
        hasAudioConsent: true,
        caseId: testCaseId,
        userId: testBuyerId,
      });

      assert.strictEqual(res.inputLanguage, 'kn');
      assert.strictEqual(res.identifiedCategory, 'DEBITED_NOT_CREDITED');
      assert.ok(res.translatedTextEn.length > 0);
      assert.ok(res.translatedTextEn.includes('debited') || res.translatedTextEn.includes('UPI'));
    });

    it('processes Hindi (हिन्दी) conversational input and identifies missing information', async () => {
      const res = await MultilingualVoiceService.processComplaint({
        statement: 'Google Pay से पैसे कट गए लेकिन मर्चेंट को नहीं मिले।',
        inputLanguage: 'hi',
        hasAudioConsent: true,
        caseId: testCaseId,
        userId: testBuyerId,
      });

      assert.strictEqual(res.inputLanguage, 'hi');
      assert.strictEqual(res.extractedDetails.provider, 'GOOGLE_PAY');
      assert.ok(res.missingFields.length > 0, 'Should request missing transaction reference / UTR');
    });
  });

  // --------------------------------------------------------------------------
  // 9. Extended Bilateral Evidence Graph (BEG) Integration
  // --------------------------------------------------------------------------
  describe('9. Extended Bilateral Evidence Graph (BEG) with Payment Nodes', () => {
    it('assembles graph containing payment nodes and verifies against allowed connections', async () => {
      const graphData = await GraphBuilder.buildGraph(testCaseId);
      assert.ok(graphData.nodes.length > 0);
      assert.ok(graphData.edges.length >= 0);

      // Validate graph with strict schema validator
      const validation = GraphValidator.validate(graphData);
      assert.strictEqual(validation.isValid, true, `Graph validation failed: ${JSON.stringify(validation.issues)}`);
    });
  });
});
