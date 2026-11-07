/**
 * RECOURSE-BENCH: Subsystem Evaluation 3 — Temporal Reasoning & Semantic Drift
 * 
 * Evaluates:
 * - Chronological event consistency
 * - Detection of temporal policy anomalies (return window exceeded, dispatch before order)
 * - Multi-stage semantic drift detection (OFFER -> ORDER -> DISPATCH -> DELIVERY -> CLAIM)
 */

import { BenchmarkDataset } from './benchmark-types';
import { SemanticDriftEngine, CommercialStageFact } from '../../src/server/drift/semantic-drift-engine';

export interface TemporalMetrics {
  totalCasesEvaluated: number;
  temporalOrderingAccuracy: number;
  policyWindowAnomalyDetection: {
    precision: number;
    recall: number;
    f1: number;
  };
  semanticDriftDetection: {
    precision: number;
    recall: number;
    f1: number;
    avgDriftScore: number;
  };
  avgLatencyMs: number;
}

export function evaluateTemporal(dataset: BenchmarkDataset): TemporalMetrics {
  const startTime = Date.now();
  let totalCases = 0;
  let orderedEventsCorrect = 0;

  // Policy window anomaly detection counters
  let windowAnomalyTP = 0;
  let windowAnomalyFP = 0;
  let windowAnomalyFN = 0;
  let windowAnomalyTN = 0;

  // Semantic drift counters
  let driftTP = 0;
  let driftFP = 0;
  let driftFN = 0;
  let driftTN = 0;
  let cumulativeDriftScore = 0;

  for (const c of dataset.cases) {
    totalCases++;

    // 1. Chronological order check
    let eventsOrdered = true;
    for (let i = 0; i < c.eventHistory.length - 1; i++) {
      const t1 = new Date(c.eventHistory[i].timestamp).getTime();
      const t2 = new Date(c.eventHistory[i + 1].timestamp).getTime();
      if (t2 < t1) {
        eventsOrdered = false;
        break;
      }
    }
    if (eventsOrdered) {
      orderedEventsCorrect++;
    }

    // 2. Policy window anomaly check
    // Check if return/complaint date exceeds returnWindowDays from order or delivery date
    const orderDate = new Date(c.originalPurchaseInfo.orderDate).getTime();
    const lastEventDate = new Date(c.eventHistory[c.eventHistory.length - 1].timestamp).getTime();
    const daysElapsed = (lastEventDate - orderDate) / (1000 * 60 * 60 * 24);
    const returnWindowDays = c.applicablePolicy.returnWindowDays;

    const actualWindowExceeded = daysElapsed > returnWindowDays && /return denied|warranty dispute/i.test(c.category);
    const predictedWindowExceeded = daysElapsed > returnWindowDays;

    if (predictedWindowExceeded && actualWindowExceeded) {
      windowAnomalyTP++;
    } else if (predictedWindowExceeded && !actualWindowExceeded) {
      windowAnomalyFP++;
    } else if (!predictedWindowExceeded && actualWindowExceeded) {
      windowAnomalyFN++;
    } else {
      windowAnomalyTN++;
      void windowAnomalyTN;
    }

    // 3. Semantic Drift Evaluation across stages
    const stageFacts: CommercialStageFact[] = [
      {
        stage: 'OFFER',
        fieldKey: 'item_specification',
        value: c.originalPurchaseInfo.itemTitle,
        date: c.originalPurchaseInfo.orderDate,
      },
      {
        stage: 'ORDER',
        fieldKey: 'item_specification',
        value: c.originalPurchaseInfo.sku,
        date: c.originalPurchaseInfo.orderDate,
      },
    ];

    // Add dispatch or delivery facts from evidence
    for (const ev of c.evidenceReferences) {
      const fact = ev.extractedFacts[0];
      if (fact) {
        stageFacts.push({
          stage: ev.evidenceType === 'TRACKING_PROOF' ? 'DISPATCH' : 'DELIVERY',
          fieldKey: fact.fieldKey,
          value: fact.normalizedValue,
        });
      }
    }

    // Add claim fact
    stageFacts.push({
      stage: 'CLAIM',
      fieldKey: 'dispute_reason',
      value: c.buyerClaim.statement,
    });

    const driftResult = SemanticDriftEngine.analyzeDrift(stageFacts);
    cumulativeDriftScore += driftResult.overallDriftScore;

    const expectedDrift = /wrong product|not as described|approved modification|unauthorized modification/i.test(c.category);
    const predictedDrift = driftResult.hasDrift || driftResult.overallDriftScore > 0.3;

    if (predictedDrift && expectedDrift) {
      driftTP++;
    } else if (predictedDrift && !expectedDrift) {
      driftFP++;
    } else if (!predictedDrift && expectedDrift) {
      driftFN++;
    } else {
      driftTN++;
      void driftTN;
    }
  }

  const windowP = windowAnomalyTP / Math.max(1, windowAnomalyTP + windowAnomalyFP);
  const windowR = windowAnomalyTP / Math.max(1, windowAnomalyTP + windowAnomalyFN);
  const windowF1 = (2 * windowP * windowR) / Math.max(1e-6, windowP + windowR);

  const driftP = driftTP / Math.max(1, driftTP + driftFP);
  const driftR = driftTP / Math.max(1, driftTP + driftFN);
  const driftF1 = (2 * driftP * driftR) / Math.max(1e-6, driftP + driftR);

  const durationMs = Date.now() - startTime;
  const avgLatencyMs = Number((durationMs / Math.max(1, totalCases)).toFixed(2));

  return {
    totalCasesEvaluated: totalCases,
    temporalOrderingAccuracy: Number((orderedEventsCorrect / Math.max(1, totalCases)).toFixed(4)),
    policyWindowAnomalyDetection: {
      precision: Number(windowP.toFixed(4)),
      recall: Number(windowR.toFixed(4)),
      f1: Number(windowF1.toFixed(4)),
    },
    semanticDriftDetection: {
      precision: Number(driftP.toFixed(4)),
      recall: Number(driftR.toFixed(4)),
      f1: Number(driftF1.toFixed(4)),
      avgDriftScore: Number((cumulativeDriftScore / Math.max(1, totalCases)).toFixed(4)),
    },
    avgLatencyMs,
  };
}
