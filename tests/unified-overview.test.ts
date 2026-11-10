import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { OverviewService } from "@/server/services/overview.service";
import type { AuthenticatedUser } from "@/server/auth/session";
import { GET as overviewSummaryGET } from "@/app/api/overview/summary/route";
import { NextRequest } from "next/server";

describe("RESOLVEGRAPH 2.0: Unified Role-Based Overview Service Suite", () => {
  let platformAdminUser: AuthenticatedUser;
  let buyerUser: AuthenticatedUser;
  let merchantUser: AuthenticatedUser;

  before(async () => {
    // 1. Load Priya Raghavan (Platform Admin)
    const priya = await prisma.user.findUniqueOrThrow({
      where: { email: "admin@resolvegraph.demo" },
    });
    platformAdminUser = {
      id: priya.id,
      email: priya.email,
      name: priya.fullName,
      fullName: priya.fullName,
      role: priya.role,
      isPlatformAdmin: true,
      isActive: true,
      avatarUrl: priya.avatarUrl,
      organization: priya.organization,
      orgMemberships: [],
    };

    // 2. Load Alex Morgan (Buyer)
    const alex = await prisma.user.findUniqueOrThrow({
      where: { email: "alex.morgan@consumer.demo" },
    });
    buyerUser = {
      id: alex.id,
      email: alex.email,
      name: alex.fullName,
      fullName: alex.fullName,
      role: alex.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: alex.avatarUrl,
      organization: alex.organization,
      orgMemberships: [],
    };

    // 3. Load TechStore Representative (Merchant)
    const merchant = await prisma.user.findUniqueOrThrow({
      where: { email: "disputes@techstore.demo" },
      include: {
        orgMemberships: {
          include: { organization: true },
        },
      },
    });
    merchantUser = {
      id: merchant.id,
      email: merchant.email,
      name: merchant.fullName,
      fullName: merchant.fullName,
      role: merchant.role,
      isPlatformAdmin: false,
      isActive: true,
      avatarUrl: merchant.avatarUrl,
      organization: merchant.organization,
      orgMemberships: merchant.orgMemberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
        },
      })),
    };
  });

  it("PLATFORM user session returns full platform scope and aggregated ledger metrics", async () => {
    const data = await OverviewService.getScopedOverview(platformAdminUser);

    // 1. Verify User Profile
    assert.equal(data.user.id, platformAdminUser.id);
    assert.equal(data.user.roleTitle, "Platform Administrator");
    assert.ok(
      data.user.organizationName.includes("ResolveGraph") ||
        data.user.organizationName.includes("Platform")
    );

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

  it("BUYER user session strictly scopes ledger and disputes to Alex Morgan", async () => {
    const data = await OverviewService.getScopedOverview(buyerUser);

    // 1. Verify User Profile
    assert.equal(data.user.id, buyerUser.id);
    assert.equal(data.user.name, buyerUser.fullName);
    assert.equal(data.user.roleTitle, "Consumer / Buyer");

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
        record.counterparty === "TechStore Global" ||
          record.counterparty.includes("Merchant") ||
          record.counterparty.includes("Apex"),
        `Expected counterparty to be a merchant, got ${record.counterparty}`
      );
    }
  });

  it("MERCHANT user session strictly scopes transactions to store scope", async () => {
    const data = await OverviewService.getScopedOverview(merchantUser);

    // 1. Verify User Profile
    assert.equal(data.user.id, merchantUser.id);
    assert.equal(data.user.roleTitle, "Merchant Representative");
    assert.ok(data.user.organizationName.includes("TechStore"));

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
        record.counterparty === "Alex Morgan" ||
          record.counterparty.includes("Buyer") ||
          record.counterparty.includes("Consumer"),
        `Expected counterparty to be a buyer/consumer, got ${record.counterparty}`
      );
    }
  });

  it("Guarantees that unauthenticated invocation is strictly rejected", async () => {
    await assert.rejects(async () => {
      // @ts-expect-error - testing runtime resilience
      await OverviewService.getScopedOverview(null);
    });
  });

  it("GET /api/overview/summary returns 401 when no session is present", async () => {
    const unauthReq = new NextRequest("http://localhost:3000/api/overview/summary");
    const res = await overviewSummaryGET(unauthReq);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error.includes("Authentication required") || body.error.includes("sign in"));
  });

  it("GET /api/overview/summary returns 200 with scoped data when authenticated", async () => {
    const authReq = new NextRequest("http://localhost:3000/api/overview/summary", {
      headers: { "x-demo-user-email": "admin@resolvegraph.demo" },
    });
    const res = await overviewSummaryGET(authReq);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user.roleTitle, "Platform Administrator");
    assert.ok(data.kpis.payments.value.includes("$"));
  });
});
