import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { UnifiedOverviewDashboard } from "@/components/overview/unified-overview-dashboard";

export const metadata: Metadata = {
  title: "Overview Dashboard — RESOLVEGRAPH",
  description:
    "Unified role-based overview dashboard connecting payments, active investigations, and evidence intelligence.",
};

export default function OverviewPage() {
  return (
    <AppShell>
      <UnifiedOverviewDashboard />
    </AppShell>
  );
}
