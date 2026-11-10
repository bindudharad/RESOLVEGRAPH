import type { Metadata } from "next";
import { DashboardProvider } from "@/components/dashboard/dashboard-context";
import { InvestigationCommandCenter } from "@/components/dashboard/investigation-command-center";

export const metadata: Metadata = {
  title: "Home — Investigation Command Center",
  description:
    "AI-powered payment investigation, cross-provider reconciliation, and evidence intelligence command center.",
};

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <InvestigationCommandCenter />
    </DashboardProvider>
  );
}
