import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { UnifiedOverviewDashboard } from "@/components/overview/unified-overview-dashboard";
import { getSessionContext } from "@/server/auth/session";
import { UserRole } from "@/generated/prisma/client";

export const metadata: Metadata = {
  title: "Overview Dashboard — RESOLVEGRAPH",
  description:
    "Unified role-based overview dashboard connecting payments, active investigations, and evidence intelligence.",
};

export default async function OverviewPage() {
  const session = await getSessionContext();
  if (
    session?.user &&
    session.user.role === UserRole.MERCHANT &&
    !session.user.isPlatformAdmin
  ) {
    redirect("/seller");
  }

  return (
    <AppShell>
      <UnifiedOverviewDashboard />
    </AppShell>
  );
}
