"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  AlertTriangle,
  FileCheck2,
  Search,
  Bell,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Network,
  Scale,
  RefreshCw,
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
      {/* SECTION 1: Welcome Header & Workspace Identification */}
      {/* ======================================================== */}
      <header data-testid="overview-header" className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* User Info & Verified Scope */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                {data?.user.roleTitle || "Authorized User"}
              </span>
              <span className="text-[var(--line-strong)]">·</span>
              <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--ink-2)] border border-[var(--line)]">
                {data?.user.organizationName || "Protected Workspace"}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)]">
              Welcome back, {data?.user.name || "User"}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--ink-2)]">
              {data?.persona === "BUYER"
                ? "Your purchases, delivery verifications, and active resolution progress."
                : data?.persona === "MERCHANT"
                ? "Store transactions, delivery manifests, and buyer claim investigations."
                : "Cross-provider payment monitoring, BERR discrepancy triage, and dual-key authorizations."}
            </p>
          </div>

          {/* Right Header Controls: Environment & Operational Status */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* System Status Pill */}
            <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/60 px-3.5 py-2 text-xs font-mono text-[var(--ink-2)] shadow-xs">
              <span className="h-2 w-2 rounded-full bg-[var(--agreed)] animate-pulse" />
              <span className="font-semibold text-[var(--ink)]">
                {data?.systemStatus.label || "PayPal Sandbox Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Global Search & Action Bar */}
        <div className="mt-6 pt-5 border-t border-[var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ink-3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Payment Ref, Case #, or Counterparty..."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/50 pl-10 pr-4 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={loadData}
              title="Refresh overview metrics"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-[var(--accent)]" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <Link
              href="/cases"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <Bell className="h-3.5 w-3.5 text-[var(--amber)]" />
              <span>Notifications</span>
              <span className="rounded-full bg-[var(--accent)]/15 px-1.5 py-0.2 font-mono text-[10px] text-[var(--accent)] font-semibold">
                {data?.recentActivity.length || 4}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* SECTION 2: Four KPI Cards */}
      {/* ======================================================== */}
      <section aria-label="Key Performance Indicators" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Payments */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">
              {data?.kpis.payments.title || "Payments"}
            </span>
            <div className="rounded-lg bg-[var(--accent)]/10 p-2 text-[var(--accent)]">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono text-2xl font-bold tracking-tight text-[var(--ink)]">
              {data?.kpis.payments.value || "$0.00 USD"}
            </span>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              {data?.kpis.payments.sublabel}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--ink-3)]">{data?.kpis.payments.trend}</span>
            <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[var(--accent)] font-semibold">
              {data?.kpis.payments.badgeText}
            </span>
          </div>
        </div>

        {/* KPI 2: Active Cases */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">
              {data?.kpis.activeCases.title || "Active Cases"}
            </span>
            <div className="rounded-lg bg-[var(--amber)]/10 p-2 text-[var(--amber)]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono text-2xl font-bold tracking-tight text-[var(--ink)]">
              {data?.kpis.activeCases.value || "0"}
            </span>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              {data?.kpis.activeCases.sublabel}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--ink-3)]">{data?.kpis.activeCases.trend}</span>
            <span className="rounded bg-[var(--amber)]/10 px-1.5 py-0.5 text-[var(--amber)] font-semibold">
              {data?.kpis.activeCases.badgeText}
            </span>
          </div>
        </div>

        {/* KPI 3: Action Required */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">
              {data?.kpis.actionRequired.title || "Action Required"}
            </span>
            <div className="rounded-lg bg-[var(--danger)]/10 p-2 text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono text-2xl font-bold tracking-tight text-[var(--ink)]">
              {data?.kpis.actionRequired.value || "0"}
            </span>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              {data?.kpis.actionRequired.sublabel}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--ink-3)]">{data?.kpis.actionRequired.trend}</span>
            <span
              className={`rounded px-1.5 py-0.5 font-semibold ${
                data?.kpis.actionRequired.value !== "0"
                  ? "bg-[var(--danger)]/15 text-[var(--danger)]"
                  : "bg-[var(--agreed)]/15 text-[var(--agreed)]"
              }`}
            >
              {data?.kpis.actionRequired.badgeText}
            </span>
          </div>
        </div>

        {/* KPI 4: Evidence Status */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">
              {data?.kpis.evidenceStatus.title || "Evidence Status"}
            </span>
            <div className="rounded-lg bg-[var(--agreed)]/10 p-2 text-[var(--agreed)]">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="font-mono text-2xl font-bold tracking-tight text-[var(--ink)]">
              {data?.kpis.evidenceStatus.value || "100%"}
            </span>
            <p className="mt-1 text-xs text-[var(--ink-2)]">
              {data?.kpis.evidenceStatus.sublabel}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-[11px] font-mono">
            <span className="text-[var(--ink-3)]">{data?.kpis.evidenceStatus.trend}</span>
            <span className="rounded bg-[var(--agreed)]/10 px-1.5 py-0.5 text-[var(--agreed)] font-semibold">
              {data?.kpis.evidenceStatus.badgeText}
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 3: Prioritized Quick Actions */}
      {/* ======================================================== */}
      <section aria-label="Quick Actions" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <span className="font-mono text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
            Quick Actions ({data?.user.roleTitle})
          </span>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            Permissions Enforced
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data?.quickActions.map((qa) => {
            return (
              <div
                key={qa.id}
                className={`relative flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  qa.disabled
                    ? "border-[var(--line)] bg-[var(--surface-2)]/30 opacity-60"
                    : "border-[var(--line)] bg-[var(--surface-2)]/50 hover:border-[var(--accent)] hover:bg-[var(--surface)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[var(--ink)]">
                      {qa.label}
                    </span>
                    {qa.badge && (
                      <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--accent)]">
                        {qa.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--ink-2)] leading-relaxed">
                    {qa.description}
                  </p>
                </div>

                <div className="mt-4 pt-2">
                  {qa.disabled ? (
                    <span className="text-[11px] font-mono text-[var(--ink-3)]">
                      Not required for platform role
                    </span>
                  ) : (
                    <Link
                      href={qa.href}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      <span>Execute action</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 4: Recent Payments and Investigations Table */}
      {/* ======================================================== */}
      <section aria-label="Recent Payments and Investigations" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[var(--ink)]">
              Recent Payments &amp; Investigations
            </h2>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Live transactions and active dispute investigations scoped to {data?.user.roleTitle}.
            </p>
          </div>
          <Link
            href="/cases"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <span>View all records ({data?.recentRecords.length || 0})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]/60 font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider">
                <th className="py-3 px-4">Payment Ref</th>
                <th className="py-3 px-4">Case #</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4">Investigation Status</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredRecords && filteredRecords.length > 0 ? (
                filteredRecords.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-[var(--surface-2)]/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-[var(--ink)]">
                      {row.paymentRef}
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--accent)]">
                      <Link href={row.viewHref} className="hover:underline">
                        {row.caseNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-[var(--ink)] max-w-xs truncate">
                      {row.counterparty}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--ink)]">
                      {row.amount}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--line)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--ink-2)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--agreed)]" />
                        <span>{row.paymentStatus}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                          row.investigationStatus === "RESOLVED"
                            ? "bg-[var(--agreed)]/15 text-[var(--agreed)]"
                            : row.investigationStatus === "EVIDENCE_REQUESTED"
                            ? "bg-[var(--amber)]/15 text-[var(--amber)]"
                            : "bg-[var(--buyer)]/15 text-[var(--buyer)]"
                        }`}
                      >
                        {row.investigationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[var(--ink-3)]">
                      {row.lastUpdated}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={row.viewHref}
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[var(--ink-3)]">
                    No transactions or active investigations match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 5: Evidence & Resolution Summary (BERR v2) */}
      {/* ======================================================== */}
      <section aria-label="Evidence and Resolution Summary" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[var(--line)] gap-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[10px] font-mono text-[var(--ink-2)]">
              <Scale className="h-3 w-3 text-[var(--accent)]" />
              <span>BERR v2 REASONING MATRIX</span>
            </div>
            <h2 className="mt-2 font-heading text-lg font-semibold text-[var(--ink)]">
              Evidence &amp; Resolution Summary
            </h2>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Facts categorized across authorized cases without unilateral bias.
            </p>
          </div>

          <Link
            href="/cases/RG-2026-0412"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <span>Open Case RG-2026-0412 Matrix</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Category 1: AGREED */}
          <div className="rounded-xl border border-[var(--agreed)]/30 bg-[var(--agreed)]/5 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--agreed)]">
                  AGREED
                </span>
                <span className="rounded-full bg-[var(--agreed)]/20 px-2 py-0.5 font-mono text-xs font-bold text-[var(--agreed)]">
                  {data?.berrSummary.agreed.count || 0}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                {data?.berrSummary.agreed.label}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--agreed)]/20 text-[11px] font-mono text-[var(--ink-3)]">
              Ex: {data?.berrSummary.agreed.example}
            </div>
          </div>

          {/* Category 2: VERIFIED */}
          <div className="rounded-xl border border-[var(--buyer)]/30 bg-[var(--buyer)]/5 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--buyer)]">
                  VERIFIED
                </span>
                <span className="rounded-full bg-[var(--buyer)]/20 px-2 py-0.5 font-mono text-xs font-bold text-[var(--buyer)]">
                  {data?.berrSummary.verified.count || 0}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                {data?.berrSummary.verified.label}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--buyer)]/20 text-[11px] font-mono text-[var(--ink-3)]">
              Ex: {data?.berrSummary.verified.example}
            </div>
          </div>

          {/* Category 3: CONTESTED */}
          <div className="rounded-xl border border-[var(--amber)]/30 bg-[var(--amber)]/5 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--amber)]">
                  CONTESTED
                </span>
                <span className="rounded-full bg-[var(--amber)]/20 px-2 py-0.5 font-mono text-xs font-bold text-[var(--amber)]">
                  {data?.berrSummary.contested.count || 0}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                {data?.berrSummary.contested.label}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--amber)]/20 text-[11px] font-mono text-[var(--amber)]">
              Ex: {data?.berrSummary.contested.example}
            </div>
          </div>

          {/* Category 4: MISSING */}
          <div className="rounded-xl border border-[var(--missing)]/30 bg-[var(--missing)]/5 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[var(--ink-3)]">
                  MISSING
                </span>
                <span className="rounded-full bg-[var(--missing)]/20 px-2 py-0.5 font-mono text-xs font-bold text-[var(--ink-3)]">
                  {data?.berrSummary.missing.count || 0}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-2)] leading-relaxed">
                {data?.berrSummary.missing.label}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--missing)]/20 text-[11px] font-mono text-[var(--ink-3)]">
              Ex: {data?.berrSummary.missing.example}
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION 6: Recent Activity & 3D Graph Teaser Grid */}
      {/* ======================================================== */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Recent Activity Feed (7 cols) */}
        <section aria-label="Recent Activity and Notifications" className="lg:col-span-7 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div>
              <h3 className="font-heading text-base font-semibold text-[var(--ink)]">
                Recent Activity &amp; Audit Events
              </h3>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">
                Hash-chained events relevant to {data?.user.roleTitle}.
              </p>
            </div>
            <span className="font-mono text-[10px] text-[var(--ink-3)]">
              Immutable Log
            </span>
          </div>

          <div className="mt-5 space-y-3.5">
            {data?.recentActivity.map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)]/40 p-3.5 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.2 font-mono text-[9px] font-semibold uppercase"
                      style={{
                        backgroundColor: `${act.badgeColor}20`,
                        color: act.badgeColor,
                      }}
                    >
                      {act.badge}
                    </span>
                    <span className="font-semibold text-[var(--ink)]">
                      {act.title}
                    </span>
                  </div>
                  <p className="text-[var(--ink-2)] leading-relaxed">
                    {act.description}
                  </p>
                </div>
                <span className="font-mono text-[10px] text-[var(--ink-3)] shrink-0 mt-0.5">
                  {act.time}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: 3D Bilateral Evidence Graph Teaser Card (5 cols) */}
        <section className="lg:col-span-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="font-heading text-base font-semibold text-[var(--ink)]">
                Bilateral Evidence Graph
              </h3>
            </div>
            <span className="rounded bg-[var(--accent)]/15 px-2 py-0.5 font-mono text-[10px] text-[var(--accent)] font-semibold">
              3D Spatial Rail
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {/* Visual Teaser Summary */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--ink-3)]">Active Case:</span>
                <span className="font-bold text-[var(--ink)]">
                  {data?.graphTeaser.caseNumber || "RG-2026-0412"}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--ink-3)]">Forensic Nodes:</span>
                <span className="font-semibold text-[var(--agreed)]">
                  {data?.graphTeaser.activeNodes || 13} Connected
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--ink-3)]">Root Cause Detected:</span>
                <span className="font-semibold text-[var(--danger)]">
                  {data?.graphTeaser.rootCause || "Carrier Hub #3 Handoff"}
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--ink-2)] leading-relaxed">
              The Bilateral Evidence Graph links purchase agreements, PayPal captures,
              warehouse manifests, and unboxing media in 3D space to detect contradictions.
            </p>

            {/* Launch Action */}
            <Link
              href={data?.graphTeaser.exploreHref || "/cases/RG-2026-0412"}
              className="group flex items-center justify-center gap-2 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Explore Evidence Graph</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <div className="pt-2 text-center">
              <span className="text-[11px] font-mono text-[var(--ink-3)]">
                5 View Modes · Frustum Projection · Accessible 2D Fallback
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
