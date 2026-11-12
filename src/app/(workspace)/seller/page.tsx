"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Clock,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Store,
} from "lucide-react";
import {
  SellerStatusPill,
  formatSellerDate,
} from "@/components/seller/seller-ui-primitives";
import { SellerContextualGuide } from "@/components/seller/seller-contextual-guide";
import { useSellerOnboarding } from "@/components/seller/seller-onboarding-provider";
import { useSession } from "@/lib/auth-client";
import type { CaptureSummaryResult } from "@/server/analytics/capture-analytics.service";
import { formatMinorCurrency } from "@/server/analytics/timezone-calendar";

interface SellerDashboardSummary {
  newRequests: number;
  inProgress: number;
  submitted: number;
  additionalInfoRequired: number;
  total: number;
}

interface RecentRequestItem {
  id: string;
  requestNumber: string;
  caseNumber: string;
  orderId: string;
  marketplace: string;
  productName: string;
  customerComplaintTitle: string;
  statusBucket: string;
  statusLabel: string;
  hasDraft: boolean;
  createdAt: string;
}

export default function SellerDashboardPage() {
  const { data: session } = useSession();
  const { openWelcomeGuide } = useSellerOnboarding();
  const orgName = (session?.user as { organization?: string } | undefined)?.organization;

  const [summary, setSummary] = useState<SellerDashboardSummary>({
    newRequests: 0,
    inProgress: 0,
    submitted: 0,
    additionalInfoRequired: 0,
    total: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RecentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureSummary, setCaptureSummary] = useState<CaptureSummaryResult | null>(null);
  const [captureLoading, setCaptureLoading] = useState(true);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const loadCaptureSummary = useCallback(async (silent = false) => {
    if (!silent) {
      setCaptureLoading(true);
    }
    setCaptureError(null);
    try {
      const res = await fetch("/api/analytics/captures/summary", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load capture summary");
      }
      setCaptureSummary(data as CaptureSummaryResult);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Failed to load capture metrics");
    } finally {
      setCaptureLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seller/requests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load seller dashboard");
      }
      if (data.summary) setSummary(data.summary);
      setRecentRequests(data.recentRequests || (data.requests || []).slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Seller Dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    void loadCaptureSummary(false);

    const onRefresh = () => {
      void loadCaptureSummary(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadCaptureSummary(true);
      }
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("resolvegraph:capture-updated", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("resolvegraph:capture-updated", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadDashboard, loadCaptureSummary]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-8">
      {/* Header */}
      <header className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 sm:px-6 sm:py-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                <Store className="h-3 w-3" />
                <span>Seller Portal</span>
              </span>
              {orgName && (
                <span className="text-xs font-medium text-[var(--ink-3)] truncate">
                  {orgName}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
              Seller Dashboard
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--ink-2)]">
              Manage customer complaints and respond to evidence requests.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink-2)] hover:bg-[var(--surface-2)] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <SellerContextualGuide
        guideId="seller-dashboard-intro"
        title="Welcome to your Seller Workspace"
        compactLabel="Workspace overview"
      >
        <p>
          Review customer complaints linked to your business, explain your perspective, and
          upload relevant fulfillment or order records so both sides are considered during
          investigation.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => openWelcomeGuide(1)}
            className="text-[var(--accent)] hover:underline"
          >
            View 4-Step Welcome Guide
          </button>
          <span aria-hidden="true" className="text-[var(--ink-3)]">
            •
          </span>
          <Link href="/seller/guidelines" className="text-[var(--accent)] hover:underline">
            Read Seller Guidelines &amp; Commitments
          </Link>
        </div>
      </SellerContextualGuide>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-4 text-xs sm:text-sm text-red-700 dark:text-red-200 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Total Capture Financial Card -> Interactive Analytics */}
      <section aria-label="Total Capture Summary">
        <Link
          href="/analytics/captures"
          data-testid="seller-total-capture-card"
          className="group block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs transition-all hover:border-emerald-500/50 focus-visible:outline-2 focus-visible:outline-emerald-500"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-2)]">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Total Capture</span>
                </span>
                {captureSummary && captureSummary.environmentMode !== "NONE" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide border ${
                      captureSummary.environmentMode === "LIVE"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {captureSummary.environmentMode === "LIVE" ? "PayPal Live" : "PayPal Sandbox"}
                  </span>
                )}
                {captureSummary && (
                  <span className="text-[11px] font-mono text-[var(--ink-3)]">
                    {captureSummary.reportingPeriod.label}
                  </span>
                )}
              </div>

              {captureLoading && !captureSummary ? (
                <div className="space-y-2 pt-1">
                  <div className="h-8 w-44 rounded bg-[var(--line)]/50 animate-pulse" />
                  <div className="h-3.5 w-56 rounded bg-[var(--line)]/30 animate-pulse" />
                </div>
              ) : captureError && !captureSummary ? (
                <div className="pt-1">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    Capture metrics unavailable
                  </p>
                  <p className="text-xs text-[var(--ink-3)]">{captureError}</p>
                </div>
              ) : captureSummary ? (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[var(--ink)]">
                      {captureSummary.availableCurrencies.length > 1
                        ? captureSummary.availableCurrencies
                            .map((c) => formatMinorCurrency(c.grossCapturedMinor, c.currency))
                            .join(" + ")
                        : formatMinorCurrency(
                            captureSummary.lifetime.grossCapturedMinor,
                            captureSummary.selectedCurrency
                          )}
                    </span>
                    {captureSummary.availableCurrencies.length <= 1 && (
                      <span className="text-xs font-mono font-semibold text-[var(--ink-3)]">
                        {captureSummary.selectedCurrency}
                      </span>
                    )}
                    {captureSummary.previousMonth.comparisonPercent !== null && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-mono font-semibold ${
                          captureSummary.previousMonth.comparisonPercent >= 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {captureSummary.previousMonth.comparisonPercent >= 0 ? "+" : ""}
                        {captureSummary.previousMonth.comparisonPercent.toFixed(1)}% vs{" "}
                        {captureSummary.previousMonth.shortLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--ink-3)]">
                    {captureSummary.lifetime.captureCount.toLocaleString("en-US")} successful capture
                    {captureSummary.lifetime.captureCount === 1 ? "" : "s"} • This month (
                    {captureSummary.currentMonth.shortLabel}):{" "}
                    <span className="font-mono font-medium text-[var(--ink-2)]">
                      {formatMinorCurrency(
                        captureSummary.currentMonth.grossCapturedMinor,
                        captureSummary.selectedCurrency
                      )}
                    </span>{" "}
                    ({captureSummary.currentMonth.captureCount})
                  </p>
                </>
              ) : null}
            </div>

            <div className="inline-flex items-center gap-2 self-start sm:self-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-500/20 transition-colors shrink-0">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>View Capture Analytics</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        </Link>
      </section>

      {/* Three Compact Summary Cards */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Request Summary</h2>
          <SellerContextualGuide
            guideId="seller-dashboard-metrics"
            title="How Request Metrics Work"
            defaultOpen={false}
            compactLabel="How metrics work"
          >
            <ul className="space-y-1">
              <li>
                <strong className="text-[var(--ink)]">New Requests:</strong> Evidence requests
                awaiting your first response or overdue for a reply.
              </li>
              <li>
                <strong className="text-[var(--ink)]">In Progress:</strong> Requests with a saved
                draft or active review awaiting submission.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Submitted:</strong> Responses already sent
                into verification and investigation.
              </li>
            </ul>
          </SellerContextualGuide>
        </div>
        <section aria-label="Request Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link
          href="/seller/requests?status=NEW"
          className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-[var(--accent)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-2)]">New Requests</span>
            <Inbox className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2.5 text-3xl font-bold tabular-nums text-[var(--ink)]">
            {loading ? "—" : summary.newRequests}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            Awaiting your initial review &amp; response
          </p>
        </Link>

        <Link
          href="/seller/requests?status=IN_PROGRESS"
          className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-[var(--accent)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-2)]">In Progress</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2.5 text-3xl font-bold tabular-nums text-[var(--ink)]">
            {loading ? "—" : summary.inProgress}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            Drafts started &amp; pending submission
          </p>
        </Link>

        <Link
          href="/seller/responses"
          className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-xs transition-colors hover:border-[var(--accent)]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--ink-2)]">Submitted</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2.5 text-3xl font-bold tabular-nums text-[var(--ink)]">
            {loading ? "—" : summary.submitted}
          </p>
          <p className="mt-1 text-xs text-[var(--ink-3)]">
            Responses submitted for verification
          </p>
        </Link>
      </section>
      </div>

      {/* Recent Evidence Requests */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[var(--ink)]">
            Recent Evidence Requests
          </h2>
          <Link
            href="/seller/requests"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            <span>View All Requests</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--ink-3)]">
            Loading evidence requests...
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-10 text-center space-y-1.5">
            <Inbox className="h-8 w-8 mx-auto text-[var(--ink-3)] mb-2" />
            <h3 className="text-sm font-bold text-[var(--ink)]">No new evidence requests</h3>
            <p className="text-xs text-[var(--ink-2)]">
              New complaint requests from RESOLVEGRAPH will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req) => {
              const ctaLabel =
                req.statusBucket === "SUBMITTED"
                  ? "View Response"
                  : req.statusBucket === "IN_PROGRESS"
                  ? "Continue Response"
                  : "Respond to Request";

              return (
                <article
                  key={req.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 shadow-xs flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-[var(--ink)]">
                        {req.caseNumber}
                      </span>
                      <span className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--ink-2)]">
                        {req.marketplace}
                      </span>
                      <SellerStatusPill label={req.statusLabel} />
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] break-words">
                      {req.productName}
                    </h3>

                    <p className="text-xs sm:text-sm text-[var(--ink-2)] break-words">
                      Customer complaint: {req.customerComplaintTitle}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-3)] pt-0.5">
                      <span>
                        Order ID: <strong className="font-mono text-[var(--ink-2)]">{req.orderId}</strong>
                      </span>
                      <span>Requested {formatSellerDate(req.createdAt)}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Link
                      href={`/seller/requests/${encodeURIComponent(req.id)}`}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                        req.statusBucket === "SUBMITTED"
                          ? "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                          : "bg-[var(--accent)] text-white hover:opacity-95"
                      }`}
                    >
                      <span>{ctaLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
