"use client";

import Link from "next/link";
import {
  FolderOpen,
  Clock,
  ShieldAlert,
  FileCheck2,
  ArrowUpRight,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { CountUp } from "@/components/landing/motion-primitives";
import { TiltCard3D } from "@/components/3d/tilt-card-3d";

export function IntelligentMetrics() {
  const { summary } = useDashboard();

  const metrics = [
    {
      id: "active-investigations",
      title: "Active Investigations",
      value: summary?.overviewMetrics?.activeInvestigations.value ?? summary?.kpis.openCases.value ?? 161,
      description: "Under active multi-party forensic review",
      status: "IN PROGRESS",
      statusTone: "info" as const,
      icon: FolderOpen,
      iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      glowColor: "rgba(59, 130, 246, 0.22)",
      href: "/cases",
    },
    {
      id: "pending-reviews",
      title: "Pending Reviews",
      value: summary?.overviewMetrics?.pendingReviews.value ?? 4,
      description: "Awaiting human officer sign-off or merchant response",
      status: "ACTION REQUIRED",
      statusTone: "warning" as const,
      icon: Clock,
      iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      glowColor: "rgba(245, 158, 11, 0.22)",
      href: "/resolution",
    },
    {
      id: "payment-conflicts",
      title: "Payment Conflicts",
      value: summary?.overviewMetrics?.paymentConflicts.value ?? 57,
      description: "Cross-provider status gaps or PayPal inquiries",
      status: "CONTESTED",
      statusTone: "danger" as const,
      icon: ShieldAlert,
      iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      glowColor: "rgba(244, 63, 94, 0.22)",
      href: "/paypal/disputes",
    },
    {
      id: "evidence-review",
      title: "Evidence Requiring Review",
      value: summary?.overviewMetrics?.evidenceRequiringReview.value ?? 33,
      description: "Unverified uploads or suspicious hashes in triage",
      status: "TRIAGE QUEUE",
      statusTone: "neutral" as const,
      icon: FileCheck2,
      iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
      glowColor: "rgba(168, 85, 247, 0.22)",
      href: "/evidence",
    },
  ];

  return (
    <section aria-label="Intelligent Overview Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((card) => {
        const Icon = card.icon;
        return (
          <TiltCard3D key={card.id} maxTilt={10} depth={20} glowColor={card.glowColor}>
            <Link
              href={card.href}
              className="group relative flex h-full flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-sm transition-all duration-200 hover:border-[var(--accent)] hover:shadow-lg paper-dark overflow-hidden"
            >
              {/* Top row: Title + Icon */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-[var(--ink-2)] group-hover:text-[var(--ink)] transition-colors">
                    {card.title}
                  </span>
                  <span className="mt-0.5 text-[10.5px] font-mono tracking-wider text-[var(--ink-3)] uppercase font-semibold">
                    {card.status}
                  </span>
                </div>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${card.iconColor} shadow-xs`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              {/* Metric Value */}
              <div className="mt-4 flex items-baseline justify-between gap-2">
                <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)] font-mono tabular-nums">
                  <CountUp end={card.value} />
                </span>
                <span className="flex items-center text-[11px] font-medium text-[var(--ink-3)] group-hover:text-[var(--accent)] transition-colors font-mono">
                  View <ArrowUpRight className="h-3 w-3 ml-0.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>

              {/* Descriptive Label */}
              <p className="mt-2 text-[11.5px] text-[var(--ink-3)] leading-relaxed border-t border-[var(--line)]/60 pt-2">
                {card.description}
              </p>
            </Link>
          </TiltCard3D>
        );
      })}
    </section>
  );
}
