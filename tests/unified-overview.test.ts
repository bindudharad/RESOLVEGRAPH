import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OverviewService } from "@/server/services/overview.service";

describe("RESOLVEGRAPH 2.0: Unified Role-Based Overview Service Suite", () => {
  it("PLATFORM persona returns full platform scope and aggregated ledger metrics", async () => {
    const data = await OverviewService.getScopedOverview("PLATFORM");

    // 1. Verify User Profile
    assert.equal(data.user.id, "usr_priya_admin");
    assert.equal(data.user.roleTitle, "Platform Administrator");
    assert.equal(data.user.organizationName, "Full Platform Scope");

    // 2. Verify 4 KPI Cards
    assert.equal(data.kpis.payments.title, "Total Monitored Volume");
    assert.ok(data.kpis.payments.value.includes("$"));
    assert.equal(data.kpis.activeCases.title, "Active Investigations");
    assert.ok(parseInt(data.kpis.activeCases.value, 10) >= 0);
    assert.equal(data.kpis.actionRequired.title, "Action Required");
    assert.equal(data.kpis.evidenceStatus.title, "Evidence Integrity");

    // 3. Verify BERR v2 Fact Summary
    assert.ok(data.berrSummary.agreed.count >= 0);
    assert.ok(data.berrSummary.verified.count >= 0);
    assert.ok(data.berrSummary.contested.count >= 0);
    assert.ok(data.berrSummary.missing.count >= 0);

    // 4. Verify Quick Actions (Submit Evidence disabled for Platform Admin)
    const submitEvidence = data.quickActions.find((a) => a.id === "submit-evidence");
    assert.ok(submitEvidence);
    assert.equal(submitEvidence.disabled, true);
    assert.equal(submitEvidence.badge, "Overseer");

    // 5. Verify 3D Graph Teaser
    assert.ok(data.graphTeaser.caseNumber);
    assert.ok(data.graphTeaser.activeNodes >= 10);
  });

  it("BUYER persona strictly scopes ledger and disputes to Alex Morgan", async () => {
    const data = await OverviewService.getScopedOverview("BUYER");

    // 1. Verify User Profile
    assert.equal(data.user.id, "usr_alex_buyer");
    assert.equal(data.user.name, "Alex Morgan");
    assert.equal(data.user.roleTitle, "Consumer / Buyer");
    assert.equal(data.user.organizationName, "Alex Morgan Personal Scope");

    // 2. Verify KPIs are scoped
    assert.equal(data.kpis.payments.title, "My Purchases");
    assert.equal(data.kpis.activeCases.title, "My Active Disputes");

    // 3. Verify Quick Actions (Submit Evidence ENABLED for Buyer)
    const submitEvidence = data.quickActions.find((a) => a.id === "submit-evidence");
    assert.ok(submitEvidence);
    assert.equal(submitEvidence.disabled, false);

    // 4. Verify Counterparty isolation in recent records
    for (const record of data.recentRecords) {
      assert.ok(
        record.counterparty === "TechStore Global" || record.counterparty.includes("Merchant"),
        `Expected counterparty to be a merchant, got ${record.counterparty}`
      );
    }
  });

  it("MERCHANT persona strictly scopes transactions to TechStore Global store scope", async () => {
    const data = await OverviewService.getScopedOverview("MERCHANT");

    // 1. Verify User Profile
    assert.equal(data.user.id, "usr_techstore_merchant");
    assert.equal(data.user.roleTitle, "Merchant Representative");
    assert.equal(data.user.organizationName, "TechStore Global Workspace");

    // 2. Verify KPIs
    assert.equal(data.kpis.payments.title, "Monitored Sales");
    assert.equal(data.kpis.activeCases.title, "Merchant Cases");

    // 3. Verify Quick Actions (Submit Evidence ENABLED for Merchant)
    const submitEvidence = data.quickActions.find((a) => a.id === "submit-evidence");
    assert.ok(submitEvidence);
    assert.equal(submitEvidence.disabled, false);

    // 4. Verify Counterparty isolation
    for (const record of data.recentRecords) {
      assert.ok(
        record.counterparty === "Alex Morgan" || record.counterparty.includes("Buyer") || record.counterparty.includes("Consumer"),
        `Expected counterparty to be a buyer/consumer, got ${record.counterparty}`
      );
    }
  });

  it("Guarantees that invalid persona defaults safely to PLATFORM scope", async () => {
    // @ts-expect-error - testing runtime resilience
    const data = await OverviewService.getScopedOverview("UNKNOWN_ROLE");
    assert.equal(data.user.roleTitle, "Platform Administrator");
  });
});
