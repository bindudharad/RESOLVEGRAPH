import type { Metadata } from "next";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { CaseDistributionChart } from "@/components/dashboard/case-distribution-chart";
import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { MetricGrid } from "@/components/dashboard/metric-card";
import { RecentCasesTable } from "@/components/dashboard/recent-cases-table";
import { ResolutionChart } from "@/components/dashboard/resolution-chart";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { PageTransition } from "@/components/common/page-transition";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Workspace overview: case volumes, resolution performance and items needing attention.",
};

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <PageTransition>
        <div className="flex flex-col gap-5">
          <WelcomeHeader />
          <MetricGrid />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <ResolutionChart />
            <CaseDistributionChart />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <AttentionPanel />
            <ActivityTimeline />
          </div>

          <RecentCasesTable />
        </div>
      </PageTransition>
    </DashboardProvider>
  );
}
