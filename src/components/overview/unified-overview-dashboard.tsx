"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Search,
  ArrowRight,
  ArrowUpRight,
  Scale,
  RefreshCw,
  FolderOpen,
  User,
  Store,
  Clock,
  Lock,
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
  const [_loadError, setLoadError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");

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
        className="glass-card rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#A7B2C2]">
                {data?.user.roleTitle || "Platform Administrator"}
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 font-mono text-[11px] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                PayPal Sandbox Mode
              </span>
            </div>

            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#F5F7FA]">
              Investigation Overview
            </h1>

            <p className="mt-1.5 text-xs sm:text-sm text-[#A7B2C2] leading-relaxed">
              Monitor disputes, evidence activity and resolution progress across active arbitration channels.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 self-start">
            {/* Date Range Selector Pill */}
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-[#111923]/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setDateRange("7d")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  dateRange === "7d"
                    ? "bg-[#3B82F6] text-white shadow-xs"
                    : "text-[#A7B2C2] hover:text-[#F5F7FA]"
                }`}
              >
                Last 7d
              </button>
              <button
                type="button"
                onClick={() => setDateRange("30d")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  dateRange === "30d"
                    ? "bg-[#3B82F6] text-white shadow-xs"
                    : "text-[#A7B2C2] hover:text-[#F5F7FA]"
                }`}
              >
                Last 30d
              </button>
              <button
                type="button"
                onClick={() => setDateRange("all")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  dateRange === "all"
                    ? "bg-[#3B82F6] text-white shadow-xs"
                    : "text-[#A7B2C2] hover:text-[#F5F7FA]"
                }`}
              >
                All Time
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadData(false)}
              title="Refresh overview metrics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#151F2B]/80 px-3 py-1.5 text-xs font-medium text-[#F5F7FA] hover:bg-[#1B2634] transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[#3B82F6]" : "text-[#A7B2C2]"}`}
              />
              <span>Refresh</span>
            </button>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#151F2B]/80 px-3 py-1.5 text-xs font-medium text-[#F5F7FA] hover:bg-[#1B2634] transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>All Cases</span>
            </Link>
            <Link
              href="/resolution"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#60A5FA] transition-colors shadow-xs"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Review Remedies</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. SIX CORE OPERATIONAL KPI CARDS                        */}
      {/* ======================================================== */}
      <section
        aria-label="Core Investigation Metrics"
        className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {/* KPI 1: Total Cases */}
        <Link
          href="/cases"
          title="View all cases"
          className="glass-card group rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:border-[#3B82F6]/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A7B2C2] group-hover:text-[#F5F7FA] transition-colors">
              Total Cases
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] group-hover:bg-[#3B82F6]/20 transition-colors">
              <FolderOpen className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold tracking-tight text-[#F5F7FA] tabular-nums">
              {data?.kpis.payments.value || "12"}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2] truncate">
              Across all marketplaces
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 text-[#3B82F6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
              Active
            </span>
            <ArrowUpRight className="h-3 w-3 text-[#A7B2C2] group-hover:text-[#3B82F6] transition-colors" />
          </div>
        </Link>

        {/* KPI 2: Active Investigations */}
        <Link
          href="/cases"
          title="View active investigations"
          className="glass-card group rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:border-amber-500/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A7B2C2] group-hover:text-[#F5F7FA] transition-colors">
              Active Investigations
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold tracking-tight text-amber-400 tabular-nums">
              {data?.kpis.activeCases.value || "4"}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2] truncate">
              In bilateral fact-finding
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              In Progress
            </span>
            <ArrowUpRight className="h-3 w-3 text-[#A7B2C2] group-hover:text-amber-400 transition-colors" />
          </div>
        </Link>

        {/* KPI 3: Pending Seller Responses */}
        <Link
          href="/seller/requests"
          title="View seller outreach"
          className="glass-card group rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:border-sky-500/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A7B2C2] group-hover:text-[#F5F7FA] transition-colors">
              Seller Responses
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
              <Store className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold tracking-tight text-[#F5F7FA] tabular-nums">
              {data?.berrSummary.missing.count || "2"}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2] truncate">
              Awaiting seller response
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Outreach
            </span>
            <ArrowUpRight className="h-3 w-3 text-[#A7B2C2] group-hover:text-sky-400 transition-colors" />
          </div>
        </Link>

        {/* KPI 4: Evidence Gaps */}
        <Link
          href="/evidence"
          title="Inspect evidence gaps"
          className="glass-card group rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:border-rose-500/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A7B2C2] group-hover:text-[#F5F7FA] transition-colors">
              Evidence Gaps
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold tracking-tight text-rose-400 tabular-nums">
              {data?.berrSummary.contested.count || "1"}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2] truncate">
              Contested or missing proofs
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Attention
            </span>
            <ArrowUpRight className="h-3 w-3 text-[#A7B2C2] group-hover:text-rose-400 transition-colors" />
          </div>
        </Link>

        {/* KPI 5: Cases Requiring Review */}
        <Link
          href="/resolution"
          title="Review cases requiring officer sign-off"
          className="glass-card group rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:border-purple-500/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A7B2C2] group-hover:text-[#F5F7FA] transition-colors">
              Requiring Review
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <Lock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold tracking-tight text-purple-400 tabular-nums">
              {data?.kpis.actionRequired.value || "3"}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2] truncate">
              Awaiting officer review
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 text-purple-400">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Sign-Off
            </span>
            <ArrowUpRight className="h-3 w-3 text-[#A7B2C2] group-hover:text-purple-400 transition-colors" />
          </div>
        </Link>

        {/* KPI 6: Resolutions Pending */}
        <Link
          href="/resolution"
          title="Inspect remedies ready for release"
          className="glass-card group rounded-2xl p-4.5 flex flex-col justify-between transition-all hover:border-emerald-500/50 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A7B2C2] group-hover:text-[#F5F7FA] transition-colors">
              Resolutions Pending
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Scale className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-mono text-2xl font-bold tracking-tight text-emerald-400 tabular-nums">
              {data?.kpis.evidenceStatus.value || "2"}
            </div>
            <p className="mt-1 text-[11.5px] text-[#A7B2C2] truncate">
              Remedies queued for release
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ready
            </span>
            <ArrowUpRight className="h-3 w-3 text-[#A7B2C2] group-hover:text-emerald-400 transition-colors" />
          </div>
        </Link>
      </section>

      {/* ======================================================== */}
      {/* 3. CASES REQUIRING ATTENTION (AUTHORITATIVE TABLE)       */}
      {/* ======================================================== */}
      <section
        aria-label="Cases Requiring Attention"
        className="glass-panel rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
      >
        <div className="p-5 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#111923]/60">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-[#F5F7FA] flex items-center gap-2">
              <span>Cases Requiring Attention</span>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-mono text-amber-300 font-semibold">
                {filteredAttentionCases.length} Active
              </span>
            </h2>
            <p className="text-xs text-[#A7B2C2] mt-0.5">
              Complaints with pending evidence requests, unresolved contradictions, or awaiting officer sign-off.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#748195]" />
            <input
              type="text"
              placeholder="Filter by complaint ID, product, seller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#151F2B]/80 pl-8.5 pr-3 py-1.5 text-xs text-[#F5F7FA] placeholder-[#748195] focus:border-[#3B82F6] focus:outline-none focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[#111923]/90 backdrop-blur-md border-b border-white/[0.08]">
              <tr className="text-[#748195] font-mono uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Case ID</th>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Marketplace</th>
                <th className="py-3 px-4 font-semibold">Seller</th>
                <th className="py-3 px-4 font-semibold">Current Stage</th>
                <th className="py-3 px-4 font-semibold">Assigned Investigator</th>
                <th className="py-3 px-4 font-semibold">Action Required</th>
                <th className="py-3 px-4 font-semibold">Last Updated</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredAttentionCases.length > 0 ? (
                filteredAttentionCases.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#F5F7FA]">
                      <Link href={c.openCaseHref} className="text-[#3B82F6] hover:text-[#60A5FA] hover:underline">
                        {c.complaintId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-[#F5F7FA] font-medium max-w-[180px] truncate" title={c.product}>
                      {c.product}
                    </td>
                    <td className="py-3.5 px-4 text-[#A7B2C2]">
                      <span className="rounded-full bg-[#3B82F6]/10 px-2.5 py-0.5 text-[10.5px] font-mono text-[#60A5FA] border border-[#3B82F6]/25 font-medium">
                        {c.marketplace}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#A7B2C2] max-w-[160px] truncate" title={c.seller}>
                      {c.seller}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10.5px] font-medium text-[#F5F7FA] border border-white/[0.08]">
                        {c.currentStage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#A7B2C2]">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3 w-3 text-[#748195]" />
                        <span>{c.assignedInvestigator}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10.5px] font-medium text-amber-300">
                        {c.actionRequired}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#748195]">
                      {c.lastUpdated}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={c.openCaseHref}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#3B82F6]/15 hover:bg-[#3B82F6]/25 border border-[#3B82F6]/30 px-2.5 py-1 text-[11px] font-medium text-[#60A5FA] hover:text-white transition-colors"
                      >
                        <span>Investigate</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#748195]">
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
          className="lg:col-span-7 glass-panel rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#3B82F6] block">
                Audit Timeline
              </span>
              <h3 className="text-sm font-semibold text-[#F5F7FA]">
                Recent Investigation Activity
              </h3>
            </div>
            <Link
              href="/admin/security"
              className="text-xs font-mono font-medium text-[#3B82F6] hover:text-[#60A5FA] hover:underline inline-flex items-center gap-1"
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
                  className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/[0.06] bg-[#1B2634]/50 hover:bg-[#1B2634]/90 hover:border-white/[0.12] transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[9.5px] font-mono font-semibold"
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
                          className="font-mono text-xs font-semibold text-[#3B82F6] hover:text-[#60A5FA] hover:underline"
                        >
                          {act.caseNumber}
                        </Link>
                      )}
                      <span className="text-xs font-medium text-[#F5F7FA] truncate">
                        {act.title}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[#A7B2C2] mt-1 leading-relaxed">
                      {act.description}
                    </p>
                  </div>
                  <span className="font-mono text-[10.5px] text-[#748195] shrink-0">
                    {act.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#748195]">
                No recent activity logged yet.
              </div>
            )}
          </div>
        </section>

        {/* Right (5 cols): BERR Evidence Classification Ledger */}
        <section
          aria-label="BERR Evidence Classification"
          className="lg:col-span-5 glass-panel rounded-2xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-purple-400 block">
                BERR Reasoning Engine
              </span>
              <h3 className="text-sm font-semibold text-[#F5F7FA]">
                BERR Analysis Summary
              </h3>
            </div>
            <Link
              href="/investigation"
              className="text-xs font-mono font-medium text-[#3B82F6] hover:text-[#60A5FA] hover:underline inline-flex items-center gap-1"
            >
              <span>BERR Engine</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#22C55E] font-semibold">
                  AGREED
                </span>
                <span className="font-mono text-base font-bold text-[#F5F7FA] tabular-nums">
                  {data?.berrSummary.agreed.count || 1}
                </span>
              </div>
              <p className="text-[10.5px] text-[#A7B2C2] mt-1 line-clamp-1">
                {data?.berrSummary.agreed.example || "Payment capture matches"}
              </p>
            </div>

            <div className="rounded-xl border border-teal-500/25 bg-teal-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-teal-400 font-semibold">
                  VERIFIED
                </span>
                <span className="font-mono text-base font-bold text-[#F5F7FA] tabular-nums">
                  {data?.berrSummary.verified.count || 2}
                </span>
              </div>
              <p className="text-[10.5px] text-[#A7B2C2] mt-1 line-clamp-1">
                {data?.berrSummary.verified.example || "Invoice & damage photo verified"}
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#EF4444] font-semibold">
                  CONTESTED
                </span>
                <span className="font-mono text-base font-bold text-[#F5F7FA] tabular-nums">
                  {data?.berrSummary.contested.count || 0}
                </span>
              </div>
              <p className="text-[10.5px] text-[#A7B2C2] mt-1 line-clamp-1">
                {data?.berrSummary.contested.example || "No active contradictions"}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase text-[#F59E0B] font-semibold">
                  MISSING
                </span>
                <span className="font-mono text-base font-bold text-[#F5F7FA] tabular-nums">
                  {data?.berrSummary.missing.count || 1}
                </span>
              </div>
              <p className="text-[10.5px] text-[#A7B2C2] mt-1 line-clamp-1">
                {data?.berrSummary.missing.example || "Seller packaging proof"}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#1B2634]/70 p-3.5 text-xs text-[#A7B2C2]">
            <div className="flex items-center gap-1.5 font-semibold text-[#F5F7FA] mb-1">
              <Lock className="h-3.5 w-3.5 text-[#3B82F6]" />
              <span>Human Arbitration Gate Active</span>
            </div>
            <p className="text-[11px] text-[#A7B2C2] leading-relaxed">
              No financial disbursement or seller fault determination executes autonomously. All remedies require investigator authorization before ledger release.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
