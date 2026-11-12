"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  AlertTriangle,
  FileCheck2,
  Search,
  ArrowRight,
  ArrowUpRight,
  Scale,
  RefreshCw,
  FolderOpen,
  User,
  Store,
  Clock,
  Sparkles,
  ShieldAlert,
  Lock,
  Building2,
} from "lucide-react";
import type { OverviewDashboardData, CaseRequiringAttentionRow } from "@/server/services/overview.service";
import { useSession } from "@/lib/auth-client";
import { BuyerComplaintWizard } from "@/components/buyer/complaint-wizard";

export function UnifiedOverviewDashboard() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<OverviewDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setLoadError(null);
    fetch("/api/overview/summary", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          router.push("/sign-in?callbackUrl=/overview");
          return null;
        }
        if (!res.ok) {
          throw new Error(`Overview summary returned ${res.status}`);
        }
        return (await res.json()) as OverviewDashboardData;
      })
      .then((json: OverviewDashboardData | null) => {
        if (json) {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load overview data:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load overview metrics");
        setLoading(false);
      });
  }, [router]);

  useEffect(() => {
    loadData(false);

    const handleRefreshEvent = () => {
      loadData(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadData(true);
      }
    };

    window.addEventListener("focus", handleRefreshEvent);
    window.addEventListener("resolvegraph:capture-updated", handleRefreshEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleRefreshEvent);
      window.removeEventListener("resolvegraph:capture-updated", handleRefreshEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadData]);

  const sessionUser = session?.user as { role?: string; isPlatformAdmin?: boolean } | undefined;
  const isBuyer = Boolean((sessionUser?.role === "BUYER" && !sessionUser?.isPlatformAdmin) || data?.persona === "BUYER");

  if (sessionPending && loading) {
    return (
      <div className="py-16 text-center text-sm text-[var(--ink-3)]">
        Loading workspace...
      </div>
    );
  }

  if (isBuyer) {
    const hasExistingComplaints =
      (data?.recentRecords?.length ?? 0) > 0 ||
      parseInt(data?.kpis?.activeCases?.value || "0", 10) > 0;
    return (
      <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto pb-10 antialiased">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:px-6 sm:py-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Customer Resolution Portal
                </span>
                {data?.user?.name && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Signed in as {data.user.name}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
                Submit a Complaint
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
                Having a problem with an online purchase? Tell us what happened, submit available evidence, and let RESOLVEGRAPH investigate.
              </p>
            </div>

            {hasExistingComplaints && (
              <div className="shrink-0">
                <Link
                  href="/cases"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 px-3.5 py-2 rounded-xl transition-colors shadow-xs whitespace-nowrap"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                  <span>My Complaints</span>
                </Link>
              </div>
            )}
          </div>
        </header>

        <BuyerComplaintWizard />
      </div>
    );
  }

  // Filter cases requiring attention based on search input
  const attentionCases: CaseRequiringAttentionRow[] =
    data?.casesRequiringAttention ||
    (data?.recentRecords || []).map((r) => ({
      id: r.caseId,
      complaintId: r.caseNumber,
      product: r.title,
      marketplace: "Marketplace",
      seller: r.counterparty,
      currentStage: r.investigationStatus,
      assignedInvestigator: "Priya Raghavan",
      actionRequired: "Review Evidence",
      lastUpdated: r.lastUpdated,
      openCaseHref: `/cases/${r.caseId}`,
    }));

  const filteredAttentionCases = attentionCases.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.complaintId.toLowerCase().includes(q) ||
      c.product.toLowerCase().includes(q) ||
      c.seller.toLowerCase().includes(q) ||
      c.marketplace.toLowerCase().includes(q) ||
      c.actionRequired.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 antialiased">
      {/* ======================================================== */}
      {/* 1. OPERATIONAL NARRATIVE & EXECUTIVE HEADER              */}
      {/* ======================================================== */}
      <header
        data-testid="overview-header"
        className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-6 shadow-xs"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {data?.user.roleTitle || "Platform Administrator"}
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Development / PayPal Sandbox (Test)
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Overview &amp; Operational Queue
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-white/70 leading-relaxed">
              ResolveGraph active arbitration overview. Displays real-time complaint ingestion, bilateral seller communication channels, cryptographic evidence verification, and human-authorized dual-key remedy execution.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start">
            <button
              type="button"
              onClick={() => loadData(false)}
              title="Refresh overview metrics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-400" : "text-white/60"}`}
              />
              <span>Refresh</span>
            </button>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.08] transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>All Cases</span>
            </Link>
            <Link
              href="/resolution"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity shadow-xs"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Review Remedies</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. FOUR CORE OPERATIONAL METRICS                         */}
      {/* ======================================================== */}
      <section
        aria-label="Core Operational Metrics"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* Metric 1: Open Cases */}
        <Link
          href="/cases"
          title="View all open cases"
          className="group rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-[var(--accent)]/40 hover:bg-white/[0.03] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">
              Open Cases
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] group-hover:bg-[var(--accent)]/20 transition-colors">
              <FolderOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {data?.kpis.payments.value || "1"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              {data?.kpis.payments.sublabel || "Active complaint investigations in progress"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">Active Queue</span>
            <span className="text-[var(--accent)] font-medium inline-flex items-center gap-1 group-hover:underline">
              <span>View Roster</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        {/* Metric 2: Awaiting Buyer/Seller Action */}
        <Link
          href="/cases"
          title="View cases awaiting party evidence"
          className="group rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-amber-500/40 hover:bg-white/[0.03] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">
              Awaiting Action
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-amber-400 tabular-nums">
              {data?.kpis.activeCases.value || "1"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              {data?.kpis.activeCases.sublabel || "Awaiting buyer or seller response"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">Bilateral Channel</span>
            <span className="text-amber-400 font-medium inline-flex items-center gap-1 group-hover:underline">
              <span>View Outreach</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        {/* Metric 3: Needs Human Review */}
        <Link
          href="/resolution"
          title="Review cases requiring officer sign-off"
          className="group rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-rose-500/40 hover:bg-white/[0.03] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">
              Needs Human Review
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-rose-400 tabular-nums">
              {data?.kpis.actionRequired.value || "1"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              {data?.kpis.actionRequired.sublabel || "Gate check requiring investigator sign-off"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">Human Review Gate</span>
            <span className="text-rose-400 font-medium inline-flex items-center gap-1 group-hover:underline">
              <span>Review Gate</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </Link>

        {/* Metric 4: Resolutions in Progress */}
        <Link
          href="/resolution"
          title="Inspect settlements and remedy disbursements"
          className="group rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between transition-all hover:border-emerald-500/40 hover:bg-white/[0.03] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">
              Resolutions in Progress
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {data?.kpis.evidenceStatus.value || "0"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              {data?.kpis.evidenceStatus.sublabel || "Settlement remedies actively executing"}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">Disbursement Rail</span>
            <span className="text-emerald-400 font-medium inline-flex items-center gap-1 group-hover:underline">
              <span>Resolution Ledger</span>
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </Link>
      </section>

      {/* ======================================================== */}
      {/* 3. CASES REQUIRING ATTENTION (AUTHORITATIVE TABLE)       */}
      {/* ======================================================== */}
      <section
        aria-label="Cases Requiring Attention"
        className="rounded-2xl border border-white/[0.08] bg-[#0E121D] shadow-xs overflow-hidden"
      >
        <div className="p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              <span>Cases Requiring Attention</span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10.5px] font-mono text-amber-300">
                {filteredAttentionCases.length} Active
              </span>
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Complaints with pending evidence requests, unresolved contradictions, or awaiting officer sign-off.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Filter by complaint ID, product, seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-8.5 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.01] text-white/40 font-mono uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Complaint ID</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4">Marketplace</th>
                <th className="py-2.5 px-4">Seller</th>
                <th className="py-2.5 px-4">Current Stage</th>
                <th className="py-2.5 px-4">Assigned Investigator</th>
                <th className="py-2.5 px-4">Action Required</th>
                <th className="py-2.5 px-4">Last Updated</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredAttentionCases.length > 0 ? (
                filteredAttentionCases.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      <Link href={c.openCaseHref} className="text-sky-400 hover:underline">
                        {c.complaintId}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-white font-medium max-w-[180px] truncate" title={c.product}>
                      {c.product}
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[10.5px] font-mono text-sky-400 border border-sky-500/20">
                        {c.marketplace}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/80 max-w-[160px] truncate" title={c.seller}>
                      {c.seller}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-white/80 border border-white/[0.06]">
                        {c.currentStage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3 text-subtle" />
                        <span>{c.assignedInvestigator}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10.5px] font-medium text-amber-300">
                        {c.actionRequired}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-white/50">
                      {c.lastUpdated}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={c.openCaseHref}
                        className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)]/15 hover:bg-[var(--accent)]/25 px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] transition-colors"
                      >
                        <span>Open Case</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-white/40">
                    No cases require attention matching your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. SPLIT LAYOUT: RECENT ACTIVITY & BERR MATRIX SUMMARY   */}
      {/* ======================================================== */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left (7 cols): Recent Activity (Real Persisted Events) */}
        <section
          aria-label="Recent Operational Activity"
          className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] block">
                Audit Timeline
              </span>
              <h3 className="text-sm font-semibold text-white">
                Recent Operational Activity
              </h3>
            </div>
            <Link
              href="/settings"
              className="text-xs font-mono font-medium text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Security &amp; Audit</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recentActivity && data.recentActivity.length > 0 ? (
              data.recentActivity.slice(0, 6).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9.5px] font-mono font-semibold"
                        style={{
                          backgroundColor: `${act.badgeColor}20`,
                          color: act.badgeColor,
                          border: `1px solid ${act.badgeColor}40`,
                        }}
                      >
                        {act.badge}
                      </span>
                      {act.caseNumber && (
                        <Link
                          href={`/cases/${act.caseId || act.caseNumber}`}
                          className="font-mono text-xs font-semibold text-sky-400 hover:underline"
                        >
                          {act.caseNumber}
                        </Link>
                      )}
                      <span className="text-xs font-medium text-white truncate">
                        {act.title}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-white/60 mt-1 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                  <span className="font-mono text-[10.5px] text-white/40 shrink-0">
                    {act.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-white/40">
                No recent activity logged yet.
              </div>
            )}
          </div>
        </section>

        {/* Right (5 cols): BERR Evidence Classification Ledger */}
        <section
          aria-label="BERR Evidence Classification"
          className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs"
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-400 block">
                BERR Reasoning Engine
              </span>
              <h3 className="text-sm font-semibold text-white">
                Bilateral Fact Classifications
              </h3>
            </div>
            <Link
              href="/evidence"
              className="text-xs font-mono font-medium text-sky-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Evidence &amp; BEG</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-emerald-400 font-semibold">
                  AGREED
                </span>
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {data?.berrSummary.agreed.count || 1}
                </span>
              </div>
              <p className="text-[10.5px] text-white/50 mt-1 line-clamp-1">
                {data?.berrSummary.agreed.example || "Payment capture matches"}
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-teal-400 font-semibold">
                  VERIFIED
                </span>
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {data?.berrSummary.verified.count || 2}
                </span>
              </div>
              <p className="text-[10.5px] text-white/50 mt-1 line-clamp-1">
                {data?.berrSummary.verified.example || "Invoice & damage photo verified"}
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-rose-400 font-semibold">
                  CONTESTED
                </span>
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {data?.berrSummary.contested.count || 0}
                </span>
              </div>
              <p className="text-[10.5px] text-white/50 mt-1 line-clamp-1">
                {data?.berrSummary.contested.example || "No active contradictions"}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-amber-400 font-semibold">
                  MISSING
                </span>
                <span className="font-mono text-base font-bold text-white tabular-nums">
                  {data?.berrSummary.missing.count || 1}
                </span>
              </div>
              <p className="text-[10.5px] text-white/50 mt-1 line-clamp-1">
                {data?.berrSummary.missing.example || "Seller packaging proof"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 text-xs text-white/60">
            <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
              <Lock className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Human Arbitration Gate Active</span>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              No financial disbursement or seller fault determination executes autonomously. All remedies require investigator authorization before ledger release.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
