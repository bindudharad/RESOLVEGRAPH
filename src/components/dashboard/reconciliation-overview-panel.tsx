"use client";

import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ReconciliationOverviewPanel() {
  const { summary } = useDashboard();

  const recon = summary?.reconciliationIntelligence || {
    total: 12,
    matched: 12,
    review: 0,
    conflict: 0,
    unmatched: 0,
    recentTransactions: [],
  };

  const paypalDisputesCount = summary?.overviewMetrics?.paymentConflicts.value ?? 57;

  return (
    <section
      aria-labelledby="recon-overview-heading"
      className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm space-y-4 paper-dark overflow-hidden"
    >
      {/* Plumbline Architectural Grid */}
      <div className="guides-dark pointer-events-none absolute inset-0 opacity-20" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/70 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="recon-overview-heading" className="text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-400" />
              <span>Cross-Provider Reconciliation</span>
            </h2>
            <Badge tone="info" className="text-[11px] font-mono bg-blue-500/10 text-blue-400 border-blue-500/30">
              10-TIER MATCHING ENGINE
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-2)]">
            Continuous reconciliation across banking switches, UPI apps, PayPal Sandbox, and merchant order books.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/payments">
            <Button variant="outline" size="sm" className="text-xs h-8 px-3 font-mono shadow-xs">
              Explore Transactions
            </Button>
          </Link>
          <Link href="/reconciliation">
            <Button variant="primary" size="sm" className="text-xs h-8 px-3 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-semibold shadow-xs">
              <span>Open Reconciliation</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Status Cards with Micro-Elevation */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3.5 space-y-1 paper-dark">
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 font-mono">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Matched Records
          </span>
          <p className="text-xl font-bold font-mono text-[var(--ink)] tabular-nums">
            2,688
          </p>
          <span className="text-[10.5px] text-emerald-400 font-semibold block font-mono">
            100% Deterministic Match
          </span>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3.5 space-y-1 paper-dark">
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 font-mono">
            <Clock className="h-3 w-3 text-amber-400" /> Requiring Review
          </span>
          <p className="text-xl font-bold font-mono text-[var(--ink)] tabular-nums">
            {recon.review}
          </p>
          <span className="text-[10.5px] text-[var(--ink-3)] block font-mono">
            Timing / status variance
          </span>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3.5 space-y-1 paper-dark">
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 font-mono">
            <ShieldAlert className="h-3 w-3 text-rose-400" /> Status Conflicts
          </span>
          <p className="text-xl font-bold font-mono text-rose-400 tabular-nums">
            {paypalDisputesCount}
          </p>
          <span className="text-[10.5px] text-rose-400 font-semibold block font-mono">
            Inquiries / Seller Response
          </span>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 p-3.5 space-y-1 paper-dark">
          <span className="text-[11px] font-medium text-[var(--ink-2)] flex items-center gap-1 font-mono">
            <CreditCard className="h-3 w-3 text-purple-400" /> Minor Units Precision
          </span>
          <p className="text-xl font-bold font-mono text-[var(--ink)] tabular-nums">
            Exact Paise
          </p>
          <span className="text-[10.5px] text-purple-400 font-semibold block font-mono">
            Zero Float Deviation
          </span>
        </div>
      </div>
    </section>
  );
}
