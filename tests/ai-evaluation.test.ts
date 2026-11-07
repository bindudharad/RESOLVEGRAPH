import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { SYNTHETIC_EVAL_DATASET } from "../src/server/ai/evaluation/dataset";
import { EvaluationRunner } from "../src/server/ai/evaluation/evaluation-runner";
import { MetricsCalculator } from "../src/server/ai/evaluation/metrics";

describe("ResolveGraph AI Evaluation Benchmark Suite", () => {
  test("Synthetic evaluation dataset contains 100 labelled scenarios across all dispute categories", () => {
    assert.strictEqual(SYNTHETIC_EVAL_DATASET.length, 100);

    const categories = new Set(SYNTHETIC_EVAL_DATASET.map((s) => s.category));
    assert.ok(categories.has("NOT_AS_DESCRIBED"));
    assert.ok(categories.has("NON_DELIVERY"));
    assert.ok(categories.has("DAMAGED_GOODS"));
    assert.ok(categories.has("REFUND_DISPUTE"));
    assert.ok(categories.has("ADVERSARIAL_INJECTION"));
    assert.ok(categories.has("TEMPORAL_ANOMALY"));
    assert.ok(categories.has("SEMANTIC_DRIFT"));

    for (const scenario of SYNTHETIC_EVAL_DATASET) {
      assert.ok(scenario.id);
      assert.ok(scenario.buyerStatement);
      assert.ok(scenario.merchantStatement);
      assert.ok(scenario.groundTruth.expectedDiscrepancyBand);
      assert.strictEqual(typeof scenario.groundTruth.hasContradiction, "boolean");
      assert.strictEqual(typeof scenario.groundTruth.isPromptInjection, "boolean");
    }
  });

  test("EvaluationRunner executes benchmark across all baselines up to Baseline D", async () => {
    const results = await EvaluationRunner.runBenchmark();

    assert.strictEqual(results.baselineA_Exact.totalScenarios, 100);
    assert.strictEqual(results.baselineB_Step4BERR.totalScenarios, 100);
    assert.strictEqual(results.baselineC_TemporalBERR.totalScenarios, 100);
    assert.strictEqual(results.baselineD_Step5Graph.totalScenarios, 100);

    // Injection defense
    assert.strictEqual(results.baselineD_Step5Graph.injectionDetectionRate, 1.0);
    // Baseline D F1 score must exceed Baseline A
    assert.ok(results.baselineD_Step5Graph.f1Score > results.baselineA_Exact.f1Score);
    // Evidence Traceability Coverage in Baseline D >= 0.95
    assert.ok(results.baselineD_Step5Graph.evidenceTraceabilityCoverage >= 0.95);
  });

  test("MetricsCalculator computes precision, recall, and F1 accurately", () => {
    const mockData = [
      {
        scenarioId: "1",
        predictedContradiction: true,
        actualContradiction: true,
        predictedInjection: false,
        actualInjection: false,
        predictedDiscrepancy: 0.8,
        actualDiscrepancyBand: "HIGH" as const,
        durationMs: 10,
      },
      {
        scenarioId: "2",
        predictedContradiction: false,
        actualContradiction: false,
        predictedInjection: false,
        actualInjection: false,
        predictedDiscrepancy: 0.2,
        actualDiscrepancyBand: "LOW" as const,
        durationMs: 10,
      },
      {
        scenarioId: "3",
        predictedContradiction: true,
        actualContradiction: false,
        predictedInjection: false,
        actualInjection: false,
        predictedDiscrepancy: 0.7,
        actualDiscrepancyBand: "LOW" as const,
        durationMs: 10,
      },
      {
        scenarioId: "4",
        predictedContradiction: false,
        actualContradiction: true,
        predictedInjection: false,
        actualInjection: false,
        predictedDiscrepancy: 0.3,
        actualDiscrepancyBand: "HIGH" as const,
        durationMs: 10,
      },
    ];

    const metrics = MetricsCalculator.calculate(mockData);

    assert.strictEqual(metrics.totalScenarios, 4);
    assert.strictEqual(metrics.accuracy, 0.5); // 2 correct out of 4
    assert.strictEqual(metrics.precision, 0.5); // 1 TP out of 2 predicted positive
    assert.strictEqual(metrics.recall, 0.5); // 1 TP out of 2 actual positive
    assert.strictEqual(metrics.f1Score, 0.5);
  });
});
