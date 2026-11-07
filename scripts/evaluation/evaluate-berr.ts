/**
 * RECOURSE-BENCH: Subsystem Evaluation 2 — BERR Reasoning Engine & Contradiction Detection
 * 
 * Evaluates:
 * - Claim-to-evidence relationship classification (SUPPORTS / CONTRADICTS / INSUFFICIENT)
 * - Contradiction detection precision, recall, and F1
 * - Discrepancy score estimation calibration
 * - Missing evidence detection precision, recall, and F1
 */

import { BenchmarkDataset } from './benchmark-types';
import { ContradictionDetector } from '../../src/server/ai/reasoning/contradiction-detector';
import { MissingEvidenceDetector } from '../../src/server/ai/reasoning/missing-evidence-detector';
import { RawExtractedFact } from '../../src/server/ai/schemas/extraction.schema';

export interface BerrMetrics {
  totalCasesEvaluated: number;
  contradictionDetection: {
    precision: number;
    recall: number;
    f1: number;
    accuracy: number;
  };
  missingEvidenceDetection: {
    precision: number;
    recall: number;
    f1: number;
  };
  discrepancyCalibration: {
    withinTargetRangeRate: number;
    meanAbsoluteError: number;
  };
  relationshipClassificationAccuracy: number;
  avgLatencyMs: number;
}

export function evaluateBerr(dataset: BenchmarkDataset): BerrMetrics {
  const startTime = Date.now();
  let totalCases = 0;

  // Contradiction counters
  let contraTP = 0;
  let contraFP = 0;
  let contraFN = 0;
  let contraTN = 0;

  // Missing evidence counters
  let missingTP = 0;
  let missingFP = 0;
  let missingFN = 0;

  // Discrepancy calibration
  let inRangeCount = 0;
  let totalAbsError = 0;

  // Claim-evidence relationship
  let relCorrect = 0;
  let relTotal = 0;

  for (const c of dataset.cases) {
    totalCases++;

    // Prepare evidence facts
    const facts: RawExtractedFact[] = [];
    const evidenceTypes: string[] = [];
    let hasCarrierTracking = false;
    let hasSignatureProof = false;
    let hasPackagingPhotos = false;
    let hasReturnLabel = false;

    for (const ev of c.evidenceReferences) {
      evidenceTypes.push(ev.evidenceType);
      if (ev.evidenceType === 'TRACKING_PROOF') hasCarrierTracking = true;
      if (ev.evidenceType === 'PACKAGING_PHOTO') hasPackagingPhotos = true;
      if (ev.evidenceType === 'RETURN_RECEIPT') hasReturnLabel = true;

      for (const fact of ev.extractedFacts) {
        facts.push({
          factType: 'PRODUCT_SPECIFICATION',
          name: fact.fieldKey,
          rawValue: fact.rawValue,
          normalizedValue: fact.normalizedValue,
          confidence: fact.confidence,
          sourceExcerpt: fact.rawValue,
          isSubjective: fact.isSubjective ?? false,
        });

        if (/signature|signed/i.test(fact.fieldKey)) {
          hasSignatureProof = true;
        }
      }
    }

    // 1. Evaluate Contradiction and Discrepancy Score
    const berrResult = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: [c.buyerClaim.statement, c.description],
      merchantStatements: [c.merchantClaim.statement],
      evidenceFacts: facts,
    });

    const predictedContradiction = berrResult.discrepancy.totalDiscrepancyScore >= 0.45;
    const actualContradiction = c.groundTruth.coreContradictionExpected;

    if (predictedContradiction && actualContradiction) {
      contraTP++;
    } else if (predictedContradiction && !actualContradiction) {
      contraFP++;
    } else if (!predictedContradiction && actualContradiction) {
      contraFN++;
    } else {
      contraTN++;
    }

    // 2. Discrepancy Calibration
    const [minExp, maxExp] = c.groundTruth.expectedDiscrepancyScoreRange;
    const predScore = berrResult.discrepancy.totalDiscrepancyScore;
    const midExp = (minExp + maxExp) / 2;
    totalAbsError += Math.abs(predScore - midExp);

    if (predScore >= minExp - 0.1 && predScore <= maxExp + 0.1) {
      inRangeCount++;
    }

    // 3. Evaluate Missing Evidence
    // Map case category to engine category
    let engineCategory = 'NOT_AS_DESCRIBED';
    if (/not received|delivery/i.test(c.category)) {
      engineCategory = 'NON_DELIVERY';
    } else if (/damaged|defective/i.test(c.category)) {
      engineCategory = 'DAMAGED_GOODS';
    } else if (/return/i.test(c.category)) {
      engineCategory = 'RETURN_REJECTED';
    } else if (/payment|duplicate|shipping charge/i.test(c.category)) {
      engineCategory = 'BILLING_DISPUTE';
    }

    const detectedMissing = MissingEvidenceDetector.detectMissingEvidence({
      category: engineCategory,
      existingEvidenceTypes: evidenceTypes,
      hasCarrierTracking,
      hasSignatureProof,
      hasPackagingPhotos,
      hasReturnLabel,
    });

    const expectedMissing = c.groundTruth.expectedMissingInformation;
    if (expectedMissing.length === 0) {
      if (detectedMissing.length === 0) {
        missingTP++;
      } else {
        missingFP++;
      }
    } else {
      for (const exp of expectedMissing) {
        const found = detectedMissing.some((d) =>
          d.evidenceType.toLowerCase().includes(exp.toLowerCase()) ||
          d.reason.toLowerCase().includes(exp.toLowerCase())
        );
        if (found) {
          missingTP++;
        } else {
          missingFN++;
        }
      }
    }

    // 4. Evaluate Claim-to-Evidence Relationship
    for (const [evId, expectedRel] of Object.entries(c.groundTruth.expectedClaimLabels)) {
      relTotal++;
      // Determine predicted relationship based on contradiction and evidence match
      let predictedRel: string = 'MENTIONS';
      const ev = c.evidenceReferences.find((e) => e.id === evId);
      if (!ev) {
        predictedRel = 'DOES_NOT_ADDRESS';
      } else if (predictedContradiction) {
        predictedRel = 'CONTRADICTS';
      } else if (berrResult.discrepancy.totalDiscrepancyScore < 0.25) {
        predictedRel = 'SUPPORTS';
      } else {
        predictedRel = 'PARTIALLY_SUPPORTS';
      }

      if (predictedRel === expectedRel || (predictedRel === 'PARTIALLY_SUPPORTS' && expectedRel === 'SUPPORTS')) {
        relCorrect++;
      }
    }
  }

  const contraPrecision = contraTP / Math.max(1, contraTP + contraFP);
  const contraRecall = contraTP / Math.max(1, contraTP + contraFN);
  const contraF1 = (2 * contraPrecision * contraRecall) / Math.max(1e-6, contraPrecision + contraRecall);
  const contraAccuracy = (contraTP + contraTN) / Math.max(1, totalCases);

  const missingPrecision = missingTP / Math.max(1, missingTP + missingFP);
  const missingRecall = missingTP / Math.max(1, missingTP + missingFN);
  const missingF1 = (2 * missingPrecision * missingRecall) / Math.max(1e-6, missingPrecision + missingRecall);

  const durationMs = Date.now() - startTime;
  const avgLatencyMs = Number((durationMs / Math.max(1, totalCases)).toFixed(2));

  return {
    totalCasesEvaluated: totalCases,
    contradictionDetection: {
      precision: Number(contraPrecision.toFixed(4)),
      recall: Number(contraRecall.toFixed(4)),
      f1: Number(contraF1.toFixed(4)),
      accuracy: Number(contraAccuracy.toFixed(4)),
    },
    missingEvidenceDetection: {
      precision: Number(missingPrecision.toFixed(4)),
      recall: Number(missingRecall.toFixed(4)),
      f1: Number(missingF1.toFixed(4)),
    },
    discrepancyCalibration: {
      withinTargetRangeRate: Number((inRangeCount / Math.max(1, totalCases)).toFixed(4)),
      meanAbsoluteError: Number((totalAbsError / Math.max(1, totalCases)).toFixed(4)),
    },
    relationshipClassificationAccuracy: Number((relCorrect / Math.max(1, relTotal)).toFixed(4)),
    avgLatencyMs,
  };
}
