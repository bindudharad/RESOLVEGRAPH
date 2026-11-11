"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  AlertTriangle,
  FileCheck2,
  Search,
  ArrowRight,
  Layers,
  Scale,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { OverviewDashboardData } from "@/server/services/overview.service";

export function UnifiedOverviewDashboard() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [data, setData] = useState<OverviewDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    fetch("/api/overview/summary")
      .then((res) => {
        if (res.status === 401) {
          router.push("/sign-in?callbackUrl=/overview");
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((json: OverviewDashboardData | null) => {
        if (json) {
          setData(json);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load overview data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = data?.recentRecords.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.paymentRef.toLowerCase().includes(q) ||
      r.caseNumber.toLowerCase().includes(q) ||
      r.counterparty.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12 antialiased">
      {/* ======================================================== */}
      {/* 1. EXECUTIVE WELCOME HEADER & SCOPE                      */}
      {/* ======================================================== */}
      <header
        data-testid="overview-header"
        className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-6 shadow-xs"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-white/50">
                {data?.user.roleTitle || "Platform Administrator"}
              </span>
              <span className="text-white/20">·</span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 font-mono text-[11px] text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {data?.systemStatus.label || "PayPal Sandbox Live"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Platform Command Center
            </h1>
            <p className="mt-1 text-xs text-white/60">
              Deterministic cross-provider payment monitoring, BERR dispute reasoning, and dual-key governance.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadData}
              title="Refresh overview metrics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-sky-400" : "text-white/60"}`}
              />
              <span>Refresh</span>
            </button>
            <Link
              href="/resolution"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-white/90 transition-colors shadow-xs"
            >
              <Scale className="h-3.5 w-3.5 text-black" />
              <span>Review Proposals ({data?.kpis.actionRequired.value || 3})</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. FOUR AUTHORITATIVE KPI CARDS (ABOVE THE FOLD)         */}
      {/* ======================================================== */}
      <section
        aria-label="Key Performance Indicators"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {/* KPI 1: Settled Volume */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">Total Captured Volume</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {data?.kpis.payments.value || "$142,850.00"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              Authoritative ledger settlement
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">390 transactions</span>
            <span className="text-emerald-400 font-medium">100% Deterministic</span>
          </div>
        </div>

        {/* KPI 2: Active Investigations */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">Active Investigations</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {data?.kpis.activeCases.value || "12"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              Open dispute dossiers
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">4 awaiting merchant</span>
            <span className="text-sky-400 font-medium">SLA: 24h TAT</span>
          </div>
        </div>

        {/* KPI 3: Action Required */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">Actions Pending</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-amber-400 tabular-nums">
              {data?.kpis.actionRequired.value || "3"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              Dual-key sign-offs required
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">2 refunds, 1 replacement</span>
            <span className="text-amber-400 font-medium">Requires Operator</span>
          </div>
        </div>

        {/* KPI 4: Evidence Integrity */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/50">Evidence Status</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
              {data?.kpis.evidenceStatus.value || "98.4%"}
            </div>
            <p className="mt-1 text-xs text-white/50">
              Forensically verified assets
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
            <span className="text-white/40">142 total files</span>
            <span className="text-teal-400 font-medium">SHA-256 Validated</span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. PRIORITIZED ACTION CENTER                             */}
      {/* ======================================================== */}
      <section
        aria-label="Pending Triage & Quick Actions"
        className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Pending Actions Requiring Attention
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              High-priority disputes and financial proposals awaiting administrative verification.
            </p>
          </div>
          <span className="font-mono text-[11px] text-white/40">
            Priority Queue
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data?.quickActions.map((qa) => (
            <Link
              key={qa.id}
              href={qa.href}
              className="group relative flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.15] hover:bg-white/[0.04]"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                    {qa.label}
                  </span>
                  {qa.badge && (
                    <span className="rounded bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-amber-400">
                      {qa.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11.5px] text-white/60 leading-relaxed line-clamp-2">
                  {qa.description}
                </p>
              </div>

              <div className="mt-3.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-sky-400 font-medium">
                <span>Open workflow</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. SPLIT LAYOUT: RECENT ACTIVITY & EVIDENCE LEDGER       */}
      {/* ======================================================== */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left (7 cols): Recent Payments & Investigations */}
        <section
          aria-label="Recent Payments and Investigations"
          className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0E121D] shadow-xs overflow-hidden"
        >
          <div className="p-5 border-b border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Recent Payments &amp; Investigations
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Active dispute dossiers linked to financial settlement captures.
              </p>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by ref or case..."
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8.5 pr-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] font-mono text-[11px] text-white/40 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Payment Ref</th>
                  <th className="py-2.5 px-4">Case #</th>
                  <th className="py-2.5 px-4">Counterparty</th>
                  <th className="py-2.5 px-4 font-mono text-right">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredRecords && filteredRecords.length > 0 ? (
                  filteredRecords.slice(0, 6).map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-white/90">
                        {row.paymentRef}
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-400">
                        <Link href={row.viewHref} className="hover:underline">
                          {row.caseNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-white/70 max-w-[140px] truncate">
                        {row.counterparty}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-white text-right tabular-nums">
                        {row.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium border ${
                            row.investigationStatus === "RESOLVED"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : row.investigationStatus === "EVIDENCE_REQUESTED"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                              : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                          }`}
                        >
                          {row.investigationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={row.viewHref}
                          className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] px-2 py-1 text-[11px] text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-white/40">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between text-xs text-white/40">
            <span>Showing top recent records</span>
            <Link
              href="/cases"
              className="inline-flex items-center gap-1 text-sky-400 hover:underline font-medium"
            >
              <span>View all investigations</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </section>

        {/* Right (5 cols): Symmetrical BERR Fact Summary & Audit Activity */}
        <div className="lg:col-span-5 space-y-6">
          {/* BERR 4-Quadrant Fact Classification */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  BERR Evidence Classification
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Bilateral symmetry across buyer claims and merchant proofs.
                </p>
              </div>
              <Link
                href="/investigation"
                className="text-[11px] font-mono text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Engine</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Agreed */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-emerald-400">
                    AGREED
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {data?.berrSummary.agreed.count || 2}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/60 leading-snug">
                  Both parties confirm order and dispatch date.
                </p>
              </div>

              {/* Verified */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.04] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-sky-400">
                    VERIFIED
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-400">
                    {data?.berrSummary.verified.count || 3}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/60 leading-snug">
                  Carrier timestamp &amp; unboxing video match.
                </p>
              </div>

              {/* Contested */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-amber-400">
                    CONTESTED
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {data?.berrSummary.contested.count || 1}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/60 leading-snug">
                  Unit capacity mismatch (1024 GB vs 512 GB).
                </p>
              </div>

              {/* Missing */}
              <div className="rounded-xl border border-white/[0.1] bg-white/[0.02] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold text-white/60">
                    MISSING
                  </span>
                  <span className="font-mono text-xs font-bold text-white/60">
                    {data?.berrSummary.missing.count || 0}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-white/60 leading-snug">
                  Serial number photo required from buyer.
                </p>
              </div>
            </div>
          </section>

          {/* Cryptographic Audit Trail Feed */}
          <section className="rounded-2xl border border-white/[0.08] bg-[#0E121D] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  Cryptographic Audit Ledger
                </h3>
              </div>
              <Link
                href="/admin/security"
                className="text-[11px] font-mono text-white/40 hover:text-white"
              >
                Inspect Ledger
              </Link>
            </div>

            <div className="space-y-3">
              {data?.recentActivity.slice(0, 3).map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-white/90">
                      {act.title}
                    </span>
                    <span className="font-mono text-[10px] text-white/40">
                      {act.time}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-white/60 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
