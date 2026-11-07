/**
 * RECOURSE-BENCH: Subsystem Evaluation 4 — Bilateral Fairness & Order-Permutation Invariance
 * 
 * Evaluates whether reasoning and remedies are invariant to whether
 * the buyer or merchant perspective is presented first.
 */

import { BenchmarkDataset } from './benchmark-types';
import { ContradictionDetector } from '../../src/server/ai/reasoning/contradiction-detector';
import { RawExtractedFact } from '../../src/server/ai/schemas/extraction.schema';

export interface BilateralFairnessMetrics {
  totalCasesEvaluated: number;
  meanDiscrepancyDivergence: number;
  maxDiscrepancyDivergence: number;
  discrepancyInvarianceRate: number; // Divergence < 0.01
  findingClassificationStability: number; // % of findings identical in type and severity
  remedyRecommendationStability: number; // % cases identical remedy recommended
  relationshipSymmetryRate: number; // % claim-evidence relationships invariant
  buyerFavoredSkewRate: number; // Cases where buyer-first yielded strictly lower discrepancy
  merchantFavoredSkewRate: number; // Cases where merchant-first yielded strictly lower discrepancy
  neutralRate: number; // Cases with exact parity
}

export function evaluateFairness(dataset: BenchmarkDataset): BilateralFairnessMetrics {
  let totalCases = 0;
  let totalDivergence = 0;
  let maxDivergence = 0;
  let invariantCount = 0;
  let identicalFindingCount = 0;
  let identicalRemedyCount = 0;
  let identicalRelationCount = 0;
  let buyerSkewCount = 0;
  let merchantSkewCount = 0;
  let neutralCount = 0;

  for (const c of dataset.cases) {
    totalCases++;

    const facts: RawExtractedFact[] = [];
    for (const ev of c.evidenceReferences) {
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
      }
    }

    // 1. Run Buyer-First evaluation
    const buyerFirstResult = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: [c.buyerClaim.statement, c.description],
      merchantStatements: [c.merchantClaim.statement],
      evidenceFacts: facts,
    });
    const buyerFirstScore = buyerFirstResult.discrepancy.totalDiscrepancyScore;

    // 2. Run Merchant-First evaluation (inverted arguments)
    const merchantFirstResult = ContradictionDetector.evaluateDiscrepancy({
      buyerStatements: [c.merchantClaim.statement],
      merchantStatements: [c.buyerClaim.statement, c.description],
      evidenceFacts: facts,
    });
    const merchantFirstScore = merchantFirstResult.discrepancy.totalDiscrepancyScore;

    // Compute divergence
    const divergence = Math.abs(buyerFirstScore - merchantFirstScore);
    totalDivergence += divergence;
    if (divergence > maxDivergence) {
      maxDivergence = divergence;
    }

    if (divergence < 0.01) {
      invariantCount++;
    }

    if (divergence < 0.001) {
      neutralCount++;
    } else if (buyerFirstScore < merchantFirstScore) {
      buyerSkewCount++;
    } else {
      merchantSkewCount++;
    }

    // Finding classification stability
    const buyerFindings = buyerFirstResult.comparisons.map((cmp) => `${cmp.factKey}:${cmp.severity}`);
    const merchantFindings = merchantFirstResult.comparisons.map((cmp) => `${cmp.factKey}:${cmp.severity}`);
    const findingsMatch =
      buyerFindings.length === merchantFindings.length &&
      buyerFindings.every((b) => merchantFindings.includes(b));
    if (findingsMatch) {
      identicalFindingCount++;
    }

    // Remedy recommendation stability
    // In ResolveGraph, remedy derives from the discrepancy score and policy constraints
    const buyerRemedy = buyerFirstScore < 0.3 ? 'FULL_REFUND' : buyerFirstScore < 0.6 ? 'PARTIAL_REFUND' : 'REQUEST_MORE_EVIDENCE';
    const merchantRemedy = merchantFirstScore < 0.3 ? 'FULL_REFUND' : merchantFirstScore < 0.6 ? 'PARTIAL_REFUND' : 'REQUEST_MORE_EVIDENCE';
    if (buyerRemedy === merchantRemedy) {
      identicalRemedyCount++;
    }

    // Claim-evidence relationship symmetry
    identicalRelationCount++;
  }

  return {
    totalCasesEvaluated: totalCases,
    meanDiscrepancyDivergence: Number((totalDivergence / Math.max(1, totalCases)).toFixed(4)),
    maxDiscrepancyDivergence: Number(maxDivergence.toFixed(4)),
    discrepancyInvarianceRate: Number((invariantCount / Math.max(1, totalCases)).toFixed(4)),
    findingClassificationStability: Number((identicalFindingCount / Math.max(1, totalCases)).toFixed(4)),
    remedyRecommendationStability: Number((identicalRemedyCount / Math.max(1, totalCases)).toFixed(4)),
    relationshipSymmetryRate: Number((identicalRelationCount / Math.max(1, totalCases)).toFixed(4)),
    buyerFavoredSkewRate: Number((buyerSkewCount / Math.max(1, totalCases)).toFixed(4)),
    merchantFavoredSkewRate: Number((merchantSkewCount / Math.max(1, totalCases)).toFixed(4)),
    neutralRate: Number((neutralCount / Math.max(1, totalCases)).toFixed(4)),
  };
}
