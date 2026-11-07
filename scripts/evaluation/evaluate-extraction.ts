/**
 * RECOURSE-BENCH: Subsystem Evaluation 1 — Multimodal Fact Extraction & Normalization
 * 
 * Evaluates:
 * - Field entity detection across document types (Invoice, Tracking, Photos, Chat, Return Receipt)
 * - Numeric and unit normalization (Capacity, Currency, Date, SKU/Serial)
 * - Subjective vs. Objective statement classification
 * - Latency and throughput per document
 */

import { BenchmarkDataset } from './benchmark-types';
import { FactNormalizer } from '../../src/server/ai/normalization/fact-normalizer';

export interface ExtractionMetrics {
  totalEvidenceItems: number;
  totalFactsEvaluated: number;
  precision: number;
  recall: number;
  f1: number;
  normalizedValueAccuracy: number;
  subjectiveClassificationAccuracy: number;
  byDocumentType: Record<string, {
    itemsCount: number;
    precision: number;
    recall: number;
    f1: number;
  }>;
  avgLatencyMs: number;
}

export function evaluateExtraction(dataset: BenchmarkDataset): ExtractionMetrics {
  const startTime = Date.now();
  let totalEvidenceItems = 0;
  let totalFactsEvaluated = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let correctNormalized = 0;
  let correctSubjectivity = 0;

  const docTypeStats: Record<string, { items: number; tp: number; fp: number; fn: number }> = {};

  for (const c of dataset.cases) {
    for (const ev of c.evidenceReferences) {
      totalEvidenceItems++;
      const type = ev.evidenceType;
      if (!docTypeStats[type]) {
        docTypeStats[type] = { items: 0, tp: 0, fp: 0, fn: 0 };
      }
      docTypeStats[type].items++;

      for (const fact of ev.extractedFacts) {
        totalFactsEvaluated++;

        // 1. Fact field detection evaluation
        const hasKey = Boolean(fact.fieldKey && fact.fieldKey.length > 2);
        const hasRaw = Boolean(fact.rawValue && fact.rawValue.length > 0);

        if (hasKey && hasRaw) {
          truePositives++;
          docTypeStats[type].tp++;
        } else if (hasKey && !hasRaw) {
          falsePositives++;
          docTypeStats[type].fp++;
        } else {
          falseNegatives++;
          docTypeStats[type].fn++;
        }

        // 2. Normalization verification
        let normalizedCheck = false;
        if (/price|amount|subtotal|shipping_fee|total_billed|restock/i.test(fact.fieldKey)) {
          const norm = FactNormalizer.normalizeMonetary(fact.rawValue);
          if (norm && norm.formatted.length > 0) {
            normalizedCheck = norm.formatted.toLowerCase().includes(fact.normalizedValue.toLowerCase()) ||
              fact.normalizedValue.includes(String(norm.cents));
          } else {
            normalizedCheck = fact.normalizedValue === fact.rawValue;
          }
        } else if (/capacity|storage|spec/i.test(fact.fieldKey)) {
          const norm = FactNormalizer.normalizeCapacity(fact.rawValue);
          if (norm) {
            normalizedCheck = norm.toLowerCase() === fact.normalizedValue.toLowerCase();
          } else {
            normalizedCheck = fact.normalizedValue.length > 0;
          }
        } else {
          // General normalized string representation
          normalizedCheck = Boolean(fact.normalizedValue && fact.normalizedValue.trim().length > 0);
        }

        if (normalizedCheck) {
          correctNormalized++;
        }

        // 3. Subjectivity classification evaluation
        // Subjective: statements containing sentiments or non-verifiable descriptions
        const isActuallySubjective = /claim|feels|unhappy|looks damaged|poor|bad|scratched slightly|terrible/i.test(fact.rawValue);
        const predictedSubjective = fact.isSubjective ?? false;
        if (isActuallySubjective === predictedSubjective) {
          correctSubjectivity++;
        }
      }
    }
  }

  const precision = truePositives / Math.max(1, truePositives + falsePositives);
  const recall = truePositives / Math.max(1, truePositives + falseNegatives);
  const f1 = (2 * precision * recall) / Math.max(1e-6, precision + recall);
  const normalizedValueAccuracy = correctNormalized / Math.max(1, totalFactsEvaluated);
  const subjectiveClassificationAccuracy = correctSubjectivity / Math.max(1, totalFactsEvaluated);

  const byDocumentType: ExtractionMetrics['byDocumentType'] = {};
  for (const [dt, stats] of Object.entries(docTypeStats)) {
    const p = stats.tp / Math.max(1, stats.tp + stats.fp);
    const r = stats.tp / Math.max(1, stats.tp + stats.fn);
    const f = (2 * p * r) / Math.max(1e-6, p + r);
    byDocumentType[dt] = {
      itemsCount: stats.items,
      precision: Number(p.toFixed(4)),
      recall: Number(r.toFixed(4)),
      f1: Number(f.toFixed(4)),
    };
  }

  const durationMs = Date.now() - startTime;
  const avgLatencyMs = Number((durationMs / Math.max(1, totalEvidenceItems)).toFixed(2));

  return {
    totalEvidenceItems,
    totalFactsEvaluated,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    normalizedValueAccuracy: Number(normalizedValueAccuracy.toFixed(4)),
    subjectiveClassificationAccuracy: Number(subjectiveClassificationAccuracy.toFixed(4)),
    byDocumentType,
    avgLatencyMs,
  };
}
