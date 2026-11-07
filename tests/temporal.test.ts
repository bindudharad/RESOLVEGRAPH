import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { TemporalEngine } from "../src/server/temporal/temporal-engine";
import { SemanticDriftEngine, CommercialStageFact } from "../src/server/drift/semantic-drift-engine";
import { prisma } from "../src/lib/prisma";

describe("ResolveGraph Temporal Intelligence & Semantic Drift Suite", () => {
  let caseId: string;

  before(async () => {
    const c = await prisma.caseRecord.findFirst();
    if (c) {
      caseId = c.id;

      // Seed deliberate temporal contradiction events for testing
      await prisma.caseTimelineEvent.createMany({
        data: [
          {
            caseId: c.id,
            eventType: "PURCHASE",
            title: "Item Purchased",
            description: "Buyer placed order",
            occurredAt: new Date("2026-10-01T10:00:00Z"),
            recordedAt: new Date("2026-10-01T10:05:00Z"),
            timePrecision: "EXACT_TIMESTAMP",
            timeBasis: "SYSTEM_OBSERVED",
          },
          {
            caseId: c.id,
            eventType: "DISPATCH",
            title: "Item Dispatched",
            description: "Carrier picked up package",
            occurredAt: new Date("2026-10-05T14:00:00Z"),
            recordedAt: new Date("2026-10-05T14:10:00Z"),
            timePrecision: "EXACT_TIMESTAMP",
            timeBasis: "SOURCE_ASSERTED",
          },
          {
            // Deliberate contradiction: delivery occurred BEFORE dispatch!
            caseId: c.id,
            eventType: "DELIVERY_COMPLETED",
            title: "Inverted Delivery Claim",
            description: "Carrier claimed delivery before dispatch",
            occurredAt: new Date("2026-10-03T09:00:00Z"),
            recordedAt: new Date("2026-10-03T09:05:00Z"),
            timePrecision: "EXACT_TIMESTAMP",
            timeBasis: "SOURCE_ASSERTED",
          },
        ],
      });
    }
  });

  test("TemporalEngine flags out-of-order stages and contradictory dates", async () => {
    if (!caseId) return;

    const { timeline, anomalies } = await TemporalEngine.analyzeCaseTimeline(caseId);

    assert.ok(timeline.length >= 3);
    assert.ok(anomalies.length > 0, "Must detect the inverted delivery date anomaly");

    const contradictoryAnomaly = anomalies.find((a) => a.anomalyType === "CONTRADICTORY_DATES");
    assert.ok(contradictoryAnomaly);
    assert.strictEqual(contradictoryAnomaly.severity, "CRITICAL");
  });

  test("TemporalEngine supports counterfactual case replay as of timestamp T", async () => {
    if (!caseId) return;

    // As of 2026-10-02 (before dispatch on Oct 5)
    const replayOct2 = await TemporalEngine.replayCaseState(caseId, "2026-10-02T23:59:59Z");
    assert.ok(replayOct2);
    assert.strictEqual(replayOct2.caseId, caseId);

    // As of today (should include everything)
    const replayNow = await TemporalEngine.replayCaseState(caseId, new Date());
    assert.ok(replayNow.eventsCount >= replayOct2.eventsCount);
  });

  test("SemanticDriftEngine pinpoints transition points and divergence severity", () => {
    const facts: CommercialStageFact[] = [
      { stage: "OFFER", fieldKey: "sku", value: "MACBOOK-M3-1TB" },
      { stage: "ORDER", fieldKey: "sku", value: "MACBOOK-M3-1TB" },
      { stage: "DISPATCH", fieldKey: "sku", value: "MACBOOK-M3-512GB" }, // Exact SKU drift!
      { stage: "DELIVERY", fieldKey: "sku", value: "MACBOOK-M3-512GB" },

      { stage: "OFFER", fieldKey: "condition", value: "Brand New Sealed" },
      { stage: "ORDER", fieldKey: "condition", value: "Brand New Sealed" },
      { stage: "DISPATCH", fieldKey: "condition", value: "Open Box Refurbished" }, // Semantic condition drift!

      {
        stage: "ORDER",
        fieldKey: "promised_delivery_date",
        value: "2026-10-10",
        date: "2026-10-10T00:00:00Z",
      },
      {
        stage: "DELIVERY",
        fieldKey: "actual_delivery_date",
        value: "2026-10-25",
        date: "2026-10-25T00:00:00Z", // 15-day delay!
      },
    ];

    const result = SemanticDriftEngine.analyzeDrift(facts);

    assert.strictEqual(result.hasDrift, true);
    assert.strictEqual(result.earliestTransitionWithDrift, "ORDER_TO_DISPATCH");
    assert.ok(result.overallDriftScore >= 0.7);

    // Verify observation categories
    const categories = new Set(result.observations.map((o) => o.driftCategory));
    assert.ok(categories.has("EXACT_ATTRIBUTE"));
    assert.ok(categories.has("SEMANTIC_SPECIFICATION"));
    assert.ok(categories.has("TEMPORAL_WINDOW"));
  });
});
