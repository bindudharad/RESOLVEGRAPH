"use client";

import { useState } from "react";
import { CommandHeader, type PersonaRole } from "@/components/dashboard/command-header";
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar";
import { IntelligentMetrics } from "@/components/dashboard/intelligent-metrics";
import { InvestigationPipeline } from "@/components/dashboard/investigation-pipeline";
import { PriorityAttentionQueue } from "@/components/dashboard/priority-attention-queue";
import { InvestigationIntelligencePanel } from "@/components/dashboard/investigation-intelligence-panel";
import { ReconciliationOverviewPanel } from "@/components/dashboard/reconciliation-overview-panel";
import { EvidenceIntelligencePanel } from "@/components/dashboard/evidence-intelligence-panel";
import { CommerceProtectionPanel } from "@/components/dashboard/commerce-protection-panel";
import { IntegrationHealthPanel } from "@/components/dashboard/integration-health-panel";
import { RecentCasesTable } from "@/components/dashboard/recent-cases-table";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { ResolutionChart } from "@/components/dashboard/resolution-chart";
import { CaseDistributionChart } from "@/components/dashboard/case-distribution-chart";
import { PageTransition } from "@/components/common/page-transition";

export function InvestigationCommandCenter() {
  const [activeRole, setActiveRole] = useState<PersonaRole>("ADMIN");

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* SECTION A — Welcome and Command Header & Role Selector */}
        <CommandHeader activeRole={activeRole} onRoleChange={setActiveRole} />

        {/* SECTION 4 — Prioritized Quick Actions */}
        <QuickActionsBar />

        {/* SECTION B — Intelligent Overview Metrics (4 Cards) */}
        <IntelligentMetrics />

        {/* SECTION H — Interactive 9-Step Investigation Methodology Rail */}
        <InvestigationPipeline />

        {/* Core Operational Forensics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Priority Queue & AI Intelligence (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* SECTION C — Priority Investigation Queue ("Needs Your Attention") */}
            <PriorityAttentionQueue />

            {/* SECTION E — AI Investigation Intelligence (BERR v2 Findings) */}
            <InvestigationIntelligencePanel />

            {/* SECTION J — Commerce Protection Snapshot */}
            <CommerceProtectionPanel />
          </div>

          {/* Right Column: Cross-Provider Reconciliation & Evidence Vault (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* SECTION G — Transaction Reconciliation Overview */}
            <ReconciliationOverviewPanel />

            {/* SECTION F — Evidence Intelligence Overview */}
            <EvidenceIntelligencePanel />

            {/* SECTION I — Integration Health & Telemetry */}
            <IntegrationHealthPanel />
          </div>
        </div>

        {/* Analytics & Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            {/* Resolution Performance Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResolutionChart />
              <CaseDistributionChart />
            </div>
          </div>

          <div className="lg:col-span-5">
            {/* SECTION K — Recent Activity & Tamper-Evident Audit Events */}
            <ActivityTimeline />
          </div>
        </div>

        {/* SECTION D — Recent Investigations Table */}
        <RecentCasesTable />
      </div>
    </PageTransition>
  );
}
